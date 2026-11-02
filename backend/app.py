import json
import os
import shutil
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import ValidationError
from rasterio.errors import RasterioError
from .analysis import analyze
from .fixtures import FIXTURES
from .models import AnalysisMetadata

MAX_FILE_BYTES = 32 * 1024 * 1024
BANDS = ("before_red", "before_nir", "after_red", "after_nir")


def create_app(data_dir: Path | None = None):
    root = data_dir or Path(
        os.environ.get("FORESTWATCH_DATA_DIR", Path(__file__).parent / "data")
    )
    root.mkdir(parents=True, exist_ok=True)
    app = FastAPI(
        title="ForestWatch raster analysis",
        version="0.1.0",
        description="Deterministic NDVI change screening. No trained classifier, automatic satellite acquisition or hardware telemetry.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.environ.get(
            "FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
        ).split(","),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    def records():
        return sorted(
            [json.loads(p.read_text()) for p in root.glob("*/result.json")],
            key=lambda r: r["metadata"]["after_date"],
            reverse=True,
        )

    def get_record(analysis_id: UUID):
        path = root / str(analysis_id) / "result.json"
        if not path.is_file():
            raise HTTPException(404, "Analysis not found")
        return json.loads(path.read_text())

    def finish(paths, metadata, folder, analysis_id):
        result = analyze(paths, metadata, folder)
        result["id"] = str(analysis_id)
        result["is_demo"] = metadata.source == "synthetic_fixture"
        result["provenance"] = (
            "Synthetic numerical fixture; not satellite observations"
            if result["is_demo"]
            else "User-provided Sentinel-2 bands; scene provenance and acquisition dates are not independently verified"
        )
        result["artifacts"] = {
            kind: f"/analyses/{analysis_id}/artifacts/{kind}.png"
            for kind in ("before", "after", "loss", "change")
        }
        temporary = folder / "result.tmp"
        temporary.write_text(json.dumps(result, allow_nan=False))
        temporary.replace(folder / "result.json")
        return result

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "service": "forestwatch-raster",
            "version": "0.1.0",
            "analysis_count": len(records()),
        }

    @app.get("/analyses")
    def analyses():
        return records()

    @app.post("/analyses/sample", status_code=201)
    def sample():
        """Compute the bundled synthetic raster example; no canned detection results."""
        metadata = AnalysisMetadata.model_validate_json(
            (FIXTURES / "metadata.json").read_text()
        )
        analysis_id = uuid4()
        folder = root / str(analysis_id)
        try:
            return finish(
                {key: FIXTURES / f"{key}.tif" for key in BANDS},
                metadata,
                folder,
                analysis_id,
            )
        except Exception:
            shutil.rmtree(folder, ignore_errors=True)
            raise

    @app.post("/analyses", status_code=201)
    def upload(
        metadata: str = Form(...),
        before_red: UploadFile = File(...),
        before_nir: UploadFile = File(...),
        after_red: UploadFile = File(...),
        after_nir: UploadFile = File(...),
        before_valid: UploadFile | None = File(None),
        after_valid: UploadFile | None = File(None),
    ):
        """Upload single-band GeoTIFFs; metadata is a JSON string. See backend README."""
        try:
            parsed = AnalysisMetadata.model_validate_json(metadata)
        except ValidationError as error:
            raise HTTPException(422, str(error)) from error
        analysis_id = uuid4()
        folder = root / str(analysis_id)
        folder.mkdir()
        paths = {}
        try:
            for key, file in {
                "before_red": before_red,
                "before_nir": before_nir,
                "after_red": after_red,
                "after_nir": after_nir,
                "before_valid": before_valid,
                "after_valid": after_valid,
            }.items():
                if file is None:
                    continue
                content = file.file.read(MAX_FILE_BYTES + 1)
                if len(content) > MAX_FILE_BYTES:
                    raise HTTPException(413, "Each raster must be 32 MiB or smaller")
                paths[key] = folder / f"input_{key}.tif"
                paths[key].write_bytes(content)
            return finish(paths, parsed, folder, analysis_id)
        except (ValueError, RasterioError) as error:
            shutil.rmtree(folder, ignore_errors=True)
            raise HTTPException(422, str(error)) from error
        except Exception:
            shutil.rmtree(folder, ignore_errors=True)
            raise
        finally:
            for file in (
                before_red,
                before_nir,
                after_red,
                after_nir,
                before_valid,
                after_valid,
            ):
                if file is not None:
                    file.file.close()

    @app.get("/analyses/{analysis_id}")
    def analysis(analysis_id: UUID):
        return get_record(analysis_id)

    @app.get("/analyses/{analysis_id}/artifacts/{kind}.{extension}")
    def artifact(
        analysis_id: UUID,
        kind: Literal["before", "after", "loss", "change"],
        extension: Literal["png", "tif"],
    ):
        get_record(analysis_id)
        return FileResponse(
            root / str(analysis_id) / f"{kind}.{extension}",
            media_type="image/png" if extension == "png" else "image/tiff",
        )

    @app.get("/detections")
    def detections():
        # One aggregate candidate per comparison; no invented object/confidence predictions.
        return [
            {
                "id": record["id"],
                "area_name": record["metadata"]["area_name"],
                "is_demo": record["is_demo"],
                "kind": "aggregate_threshold_loss_candidate",
                "loss_area_ha": record["statistics"]["loss_area_ha"],
                "loss_pixels": record["statistics"]["loss_pixels"],
                "bounds_wgs84": record["bounds_wgs84"],
                "geometry_note": "Bounds describe the whole input raster; use loss GeoTIFF for affected pixels",
                "risk_score": record["risk"]["score"],
            }
            for record in records()
            if record["statistics"]["loss_pixels"] > 0
        ]

    @app.get("/monitoring-areas")
    def monitoring_areas():
        return [
            {
                "id": record["id"],
                "name": record["metadata"]["area_name"],
                "is_demo": record["is_demo"],
                "bounds_wgs84": record["bounds_wgs84"],
                "valid_area_ha": record["statistics"]["valid_area_ha"],
                "before_date": record["metadata"]["before_date"],
                "after_date": record["metadata"]["after_date"],
            }
            for record in records()
        ]

    @app.get("/risk-scores")
    def risks():
        return [
            {"id": record["id"], "is_demo": record["is_demo"], **record["risk"]}
            for record in records()
        ]

    return app


app = create_app()
