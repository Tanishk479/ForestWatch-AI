import json
import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin
from fastapi.testclient import TestClient
from backend.analysis import analyze, ndvi, risk_score
from backend.app import create_app, BANDS
from backend.fixtures import generate
from backend.models import AnalysisMetadata


@pytest.fixture
def rasters(tmp_path):
    folder = tmp_path / "fixture"
    generate(folder)
    metadata = AnalysisMetadata.model_validate_json(
        (folder / "metadata.json").read_text()
    )
    return {key: folder / f"{key}.tif" for key in BANDS}, metadata


def test_ndvi_masks_and_numerics():
    result = ndvi(
        np.array([1.0, 0, 1, -1]),
        np.array([3.0, 0, 3, 3]),
        np.array([True, True, False, True]),
    )
    assert result[0] == 0.5
    assert np.isnan(result[1:]).all()


def test_known_fixture_loss_area_and_products(rasters, tmp_path):
    paths, metadata = rasters
    output = tmp_path / "output"
    result = analyze(paths, metadata, output)
    stats = result["statistics"]
    assert stats["valid_pixels"] == 256
    assert stats["loss_pixels"] == 16
    assert stats["mean_before_ndvi"] == pytest.approx(0.75)
    assert stats["mean_after_ndvi"] == pytest.approx(0.715625)
    assert stats["mean_ndvi_change"] == pytest.approx(-0.034375)
    assert stats["loss_area_ha"] == pytest.approx(0.16)
    assert stats["loss_fraction"] == pytest.approx(16 / 256)
    # .35*.625 + .30*(.034375/.3) + .20*.75 + .15*.2 = .433125
    assert result["risk"]["score"] == pytest.approx(43.31)
    with rasterio.open(output / "loss.tif") as ds:
        assert ds.crs.to_epsg() == 32643
        assert ds.transform.a == 10
        assert int(ds.read(1).sum()) == 16
    assert all(
        (output / f"{name}.png").is_file()
        for name in ("before", "after", "loss", "change")
    )


def test_no_change_no_loss(rasters, tmp_path):
    paths, metadata = rasters
    paths["after_nir"] = paths["before_nir"]
    result = analyze(paths, metadata, tmp_path / "out")
    assert result["statistics"]["loss_pixels"] == 0
    assert result["statistics"]["mean_ndvi_change"] == 0


def test_product_offsets_apply(rasters, tmp_path):
    paths, metadata = rasters
    metadata.before_offset = 0.1
    result = analyze(paths, metadata, tmp_path / "out")
    assert result["statistics"]["mean_before_ndvi"] == pytest.approx(0.6)


def test_common_nodata_excluded(rasters, tmp_path):
    paths, metadata = rasters
    with rasterio.open(paths["after_nir"], "r+") as ds:
        array = ds.read(1)
        array[4, 4] = 0
        ds.write(array, 1)
    result = analyze(paths, metadata, tmp_path / "out")
    assert result["statistics"]["valid_pixels"] == 255
    assert result["statistics"]["loss_pixels"] == 15
    with rasterio.open(tmp_path / "out/loss.tif") as ds:
        assert ds.read(1, masked=True).mask[4, 4]


def test_quality_mask_excludes_clouds(rasters, tmp_path):
    paths, metadata = rasters
    mask = tmp_path / "quality.tif"
    with rasterio.open(paths["before_red"]) as ds:
        profile = ds.profile
    array = np.ones((16, 16), dtype="uint16")
    array[4:8, 4:8] = 0
    with rasterio.open(mask, "w", **profile) as ds:
        ds.write(array, 1)
    paths["before_valid"] = paths["after_valid"] = mask
    result = analyze(paths, metadata, tmp_path / "out")
    assert result["statistics"]["loss_pixels"] == 0
    assert not any("not supplied" in w for w in result["warnings"])


@pytest.mark.parametrize(
    "crs,transform",
    [
        ("EPSG:4326", from_origin(76, 12, 0.001, 0.001)),
        ("EPSG:32643", from_origin(615000, 1280000, 10, 10)),
    ],
)
def test_reject_wrong_crs_or_grid(rasters, tmp_path, crs, transform):
    paths, metadata = rasters
    with rasterio.open(paths["after_red"], "r+") as ds:
        ds.crs = crs
        ds.transform = transform
    with pytest.raises(ValueError):
        analyze(paths, metadata, tmp_path / "out")


def test_no_valid_pixels_rejected(rasters, tmp_path):
    paths, metadata = rasters
    with rasterio.open(paths["after_nir"], "r+") as ds:
        ds.write(np.zeros((16, 16), dtype="uint16"), 1)
    with pytest.raises(ValueError, match="No common valid"):
        analyze(paths, metadata, tmp_path / "out")


def test_risk_missing_and_bounds():
    assert risk_score(1, 2, 0, 1)["score"] == 100
    assert risk_score(0, 0, 5000, 0)["score"] == 0
    risk = risk_score(0.1, 0.3, None, None)
    assert risk["score"] is None
    assert set(risk["missing_inputs"]) == {"road_proximity", "historical_disturbance"}
    assert sum(c["weight"] for c in risk["components"].values()) == pytest.approx(1)


def test_upload_and_api_end_to_end(rasters, tmp_path):
    paths, metadata = rasters
    client = TestClient(create_app(tmp_path / "storage"))
    assert client.get("/health").json()["status"] == "ok"
    assert client.get("/detections").json() == []
    response = client.post(
        "/analyses",
        data={"metadata": metadata.model_dump_json()},
        files={
            key: ("band.tif", path.read_bytes(), "image/tiff")
            for key, path in paths.items()
        },
    )
    assert response.status_code == 201, response.text
    record = response.json()
    assert record["is_demo"] is True
    assert record["statistics"]["loss_area_ha"] == 0.16
    assert client.get("/analyses/" + record["id"]).json() == record
    assert len(client.get("/monitoring-areas").json()) == 1
    assert client.get("/detections").json()[0]["loss_pixels"] == 16
    assert client.get("/risk-scores").json()[0]["score"] == 43.31
    assert (
        client.get(record["artifacts"]["loss"]).headers["content-type"] == "image/png"
    )
    assert (
        client.get(record["artifacts"]["change"].replace(".png", ".tif")).status_code
        == 200
    )
    assert (
        client.get(f"/analyses/{record['id']}/artifacts/secret.png").status_code == 422
    )
    # Persistence works across app instances.
    assert (
        len(TestClient(create_app(tmp_path / "storage")).get("/analyses").json()) == 1
    )


def test_bad_upload_and_metadata(rasters, tmp_path):
    paths, metadata = rasters
    client = TestClient(create_app(tmp_path / "storage"))
    files = {key: ("band.tif", path.read_bytes()) for key, path in paths.items()}
    assert (
        client.post("/analyses", data={"metadata": "{}"}, files=files).status_code
        == 422
    )
    files["after_red"] = ("invalid.tif", b"not a raster")
    assert (
        client.post(
            "/analyses", data={"metadata": metadata.model_dump_json()}, files=files
        ).status_code
        == 422
    )
    assert list((tmp_path / "storage").iterdir()) == []
    bad = json.loads(metadata.model_dump_json())
    bad["after_date"] = bad["before_date"]
    assert (
        client.post(
            "/analyses", data={"metadata": json.dumps(bad)}, files=files
        ).status_code
        == 422
    )
    assert (
        client.get("/analyses/00000000-0000-0000-0000-000000000000").status_code == 404
    )


def test_sample_endpoint_computes(tmp_path):
    client = TestClient(create_app(tmp_path / "storage"))
    response = client.post("/analyses/sample")
    assert response.status_code == 201
    assert response.json()["statistics"]["loss_pixels"] == 16


def test_no_baseline_forest_is_not_a_zero_risk_claim(rasters, tmp_path):
    paths, metadata = rasters
    paths["before_nir"] = paths["before_red"]
    result = analyze(paths, metadata, tmp_path / "out")
    assert result["statistics"]["baseline_forest_pixels"] == 0
    assert result["risk"]["score"] is None
    assert "baseline_forest_pixels" in result["risk"]["missing_inputs"]


def test_upload_real_input_contract_and_missing_context(rasters, tmp_path):
    paths, metadata = rasters
    # Synthetic bytes exercise the real-upload contract; these are not real observations.
    metadata.source = "sentinel2"
    metadata.road_distance_m = None
    metadata.historical_disturbance_fraction = None
    client = TestClient(create_app(tmp_path / "storage"))
    result = client.post(
        "/analyses",
        data={"metadata": metadata.model_dump_json()},
        files={k: ("band.tif", p.read_bytes()) for k, p in paths.items()},
    )
    assert result.status_code == 201
    assert result.json()["is_demo"] is False
    assert "not independently verified" in result.json()["provenance"]
    assert result.json()["risk"]["score"] is None


def test_invalid_quality_grid_and_file_limit(rasters, tmp_path, monkeypatch):
    paths, metadata = rasters
    mask = tmp_path / "mask.tif"
    with rasterio.open(paths["before_red"]) as ds:
        profile = ds.profile | {"transform": from_origin(615000, 1280000, 10, 10)}
    with rasterio.open(mask, "w", **profile) as ds:
        ds.write(np.ones((16, 16), dtype="uint16"), 1)
    paths["before_valid"] = mask
    with pytest.raises(ValueError, match="Quality masks"):
        analyze(paths, metadata, tmp_path / "out")
    monkeypatch.setattr("backend.app.MAX_FILE_BYTES", 100)
    client = TestClient(create_app(tmp_path / "storage"))
    response = client.post(
        "/analyses",
        data={"metadata": metadata.model_dump_json()},
        files={k: ("band.tif", paths[k].read_bytes()) for k in BANDS},
    )
    assert response.status_code == 413
    assert list((tmp_path / "storage").iterdir()) == []
