"""Deterministic two-date NDVI change screening; not a forest classifier."""

from pathlib import Path
import numpy as np
import rasterio
from rasterio.warp import transform_bounds
from PIL import Image
from .models import AnalysisMetadata

MAX_PIXELS = 4_000_000
WEIGHTS = {
    "loss_area": 0.35,
    "ndvi_decline": 0.30,
    "road_proximity": 0.20,
    "historical_disturbance": 0.15,
}


def ndvi(red, nir, valid):
    denominator = nir + red
    usable = (
        valid
        & np.isfinite(red)
        & np.isfinite(nir)
        & (red >= 0)
        & (nir >= 0)
        & (denominator > 1e-10)
    )
    result = np.full(red.shape, np.nan, dtype=np.float32)
    np.divide(nir - red, denominator, out=result, where=usable)
    return result


def risk_score(loss_fraction, mean_decline, road_distance_m, history_fraction):
    # These normalization scales are explicit engineering assumptions, not paper claims.
    normalized = {
        "loss_area": min(1.0, max(0.0, loss_fraction / 0.10)),
        "ndvi_decline": min(1.0, max(0.0, mean_decline / 0.30)),
        "road_proximity": None
        if road_distance_m is None
        else max(0.0, 1 - road_distance_m / 1000),
        "historical_disturbance": history_fraction,
    }
    components = {
        name: {
            "weight": weight,
            "normalized": normalized[name],
            "contribution": None
            if normalized[name] is None
            else round(100 * weight * normalized[name], 6),
        }
        for name, weight in WEIGHTS.items()
    }
    missing = [name for name, value in normalized.items() if value is None]
    return {
        "score": None
        if missing
        else round(sum(100 * WEIGHTS[k] * v for k, v in normalized.items()), 2),
        "components": components,
        "missing_inputs": missing,
        "normalization": {
            "loss_fraction_saturation": 0.10,
            "ndvi_decline_saturation": 0.30,
            "road_influence_distance_m": 1000,
            "history": "fraction 0–1",
        },
        "weights_source": "User-supplied weights; paper and calibration not independently verified",
        "interpretation": "Heuristic screening score, not a probability or trained-model prediction",
    }


def analyze(paths: dict[str, Path], metadata: AnalysisMetadata, output: Path):
    bands, valid, reference = {}, None, None
    for key in ("before_red", "before_nir", "after_red", "after_nir"):
        with rasterio.open(paths[key], driver="GTiff") as ds:
            if (
                ds.count != 1
                or ds.width * ds.height > MAX_PIXELS
                or np.dtype(ds.dtypes[0]).kind not in "uif"
            ):
                raise ValueError(
                    "Each band must be single-band and at most 4 million pixels"
                )
            if not ds.crs or not ds.crs.is_projected or ds.crs.linear_units != "metre":
                raise ValueError(
                    "Use a projected CRS with metre units (e.g. local UTM); geographic degrees are not area units"
                )
            if reference is None:
                reference = ds.profile.copy()
                bounds = transform_bounds(ds.crs, "EPSG:4326", *ds.bounds)
            elif (
                ds.shape != (reference["height"], reference["width"])
                or ds.crs != reference["crs"]
                or not ds.transform.almost_equals(
                    reference["transform"], precision=1e-8
                )
            ):
                raise ValueError(
                    "All bands must share the same CRS, dimensions and pixel grid; co-register first"
                )
            if not np.isfinite(tuple(ds.transform)).all():
                raise ValueError("Non-finite raster transform")
            raw = ds.read(1, masked=True)
            usable = ~np.ma.getmaskarray(raw)
            valid = usable if valid is None else valid & usable
            prefix = key.split("_")[0]
            bands[key] = raw.filled(0).astype(np.float32) * getattr(
                metadata, f"{prefix}_scale"
            ) + getattr(metadata, f"{prefix}_offset")
    # Optional externally prepared cloud/shadow/quality masks: 1=usable, 0=exclude.
    for key in ("before_valid", "after_valid"):
        if key in paths:
            with rasterio.open(paths[key], driver="GTiff") as ds:
                if (
                    ds.count != 1
                    or ds.shape != valid.shape
                    or ds.crs != reference["crs"]
                    or not ds.transform.almost_equals(
                        reference["transform"], precision=1e-8
                    )
                ):
                    raise ValueError("Quality masks must share the band grid")
                quality = ds.read(1, masked=True)
                valid &= ~np.ma.getmaskarray(quality) & (quality.filled(0) == 1)
    before = ndvi(bands["before_red"], bands["before_nir"], valid)
    after = ndvi(bands["after_red"], bands["after_nir"], valid)
    valid &= np.isfinite(before) & np.isfinite(after)
    if not valid.any():
        raise ValueError(
            "No common valid pixels after nodata, quality and denominator masking"
        )
    before[~valid] = np.nan
    after[~valid] = np.nan
    delta = after - before
    baseline = valid & (before >= metadata.forest_threshold)
    loss = (
        baseline
        & (after < metadata.forest_threshold)
        & (delta <= -metadata.decline_threshold)
    )
    t = reference["transform"]
    pixel_area = abs(t.a * t.e - t.b * t.d)
    if not np.isfinite(pixel_area) or pixel_area <= 0:
        raise ValueError("Raster pixel area must be positive and finite")
    n_valid, n_forest, n_loss = int(valid.sum()), int(baseline.sum()), int(loss.sum())
    loss_fraction = n_loss / n_forest if n_forest else 0.0
    decline = float(np.maximum(-delta[baseline], 0).mean()) if n_forest else 0.0
    stats = {
        "valid_pixels": n_valid,
        "excluded_pixels": int(valid.size - n_valid),
        "baseline_forest_pixels": n_forest,
        "loss_pixels": n_loss,
        "pixel_area_m2": pixel_area,
        "valid_area_ha": n_valid * pixel_area / 10000,
        "baseline_forest_area_ha": n_forest * pixel_area / 10000,
        "loss_area_ha": n_loss * pixel_area / 10000,
        "loss_fraction": loss_fraction,
        "mean_before_ndvi": float(before[valid].mean()),
        "mean_after_ndvi": float(after[valid].mean()),
        "mean_ndvi_change": float(delta[valid].mean()),
        "mean_baseline_decline": decline,
    }
    output.mkdir(parents=True, exist_ok=True)
    profile = reference | {
        "driver": "GTiff",
        "dtype": "float32",
        "count": 1,
        "nodata": -9999,
        "compress": "deflate",
    }
    for name, array in {
        "before": before,
        "after": after,
        "change": delta,
        "loss": np.where(valid, loss, np.nan),
    }.items():
        with rasterio.open(output / f"{name}.tif", "w", **profile) as ds:
            ds.write(np.where(np.isfinite(array), array, -9999).astype("float32"), 1)
        rgba = np.zeros((*array.shape, 4), dtype=np.uint8)
        if name == "loss":
            rgba[valid] = [27, 64, 43, 255]
            rgba[loss] = [246, 119, 80, 255]
        elif name == "change":
            magnitude = np.clip(np.abs(np.nan_to_num(array)) / 0.5, 0, 1)
            rgba[..., 0] = np.where(array < 0, 100 + 155 * magnitude, 35).astype(
                "uint8"
            )
            rgba[..., 1] = np.where(array >= 0, 100 + 155 * magnitude, 55).astype(
                "uint8"
            )
            rgba[..., 2] = 65
            rgba[..., 3] = valid.astype("uint8") * 255
        else:
            x = np.clip((np.nan_to_num(array) + 1) / 2, 0, 1)
            rgba[..., 0] = (180 * (1 - x) + 25).astype("uint8")
            rgba[..., 1] = (60 + 170 * x).astype("uint8")
            rgba[..., 2] = (40 + 40 * x).astype("uint8")
            rgba[..., 3] = valid.astype("uint8") * 255
        Image.fromarray(rgba).save(output / f"{name}.png")
    warnings = [
        "Threshold-based canopy-loss candidate, not confirmed deforestation or a trained U-Net prediction.",
        "Seasonality, atmosphere, registration errors and NDVI saturation can affect results.",
    ]
    if not all(k in paths for k in ("before_valid", "after_valid")):
        warnings.append(
            "Cloud/shadow quality masks not supplied for both dates; unmasked clouds can cause false detections."
        )
    risk = risk_score(
        loss_fraction,
        decline,
        metadata.road_distance_m,
        metadata.historical_disturbance_fraction,
    )
    if not n_forest:
        risk["score"] = None
        risk["missing_inputs"].append("baseline_forest_pixels")
        warnings.append(
            "No baseline pixels meet the forest NDVI threshold; forest-loss risk cannot be estimated."
        )
    return {
        "metadata": metadata.model_dump(mode="json"),
        "statistics": stats,
        "bounds_wgs84": list(bounds),
        "risk": risk,
        "warnings": warnings,
        "comparison_kind": "NDVI pseudocolor (B4/B8), not true-color imagery",
    }
