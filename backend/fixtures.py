"""Reproducible synthetic numerical test inputs; never satellite observations."""

import json
from pathlib import Path
import numpy as np
import rasterio
from rasterio.transform import from_origin

FIXTURES = Path(__file__).parent / "fixtures"


def generate(destination=FIXTURES):
    destination.mkdir(parents=True, exist_ok=True)
    red = np.full((16, 16), 1000, dtype="uint16")
    before = np.full((16, 16), 7000, dtype="uint16")  # NDVI .75
    after = before.copy()
    after[4:8, 4:8] = 1500  # 16 pixels decline to .2; .16 ha at 10 m
    for name, array in {
        "before_red": red,
        "before_nir": before,
        "after_red": red,
        "after_nir": after,
    }.items():
        with rasterio.open(
            destination / f"{name}.tif",
            "w",
            driver="GTiff",
            height=16,
            width=16,
            count=1,
            dtype="uint16",
            crs="EPSG:32643",
            transform=from_origin(614000, 1280000, 10, 10),
            nodata=0,
        ) as ds:
            ds.write(array, 1)
    metadata = {
        "area_name": "Synthetic 16×16 test plot",
        "source": "synthetic_fixture",
        "before_date": "2026-10-04",
        "after_date": "2026-11-03",
        "before_scale": 0.0001,
        "before_offset": 0,
        "after_scale": 0.0001,
        "after_offset": 0,
        "road_distance_m": 250,
        "historical_disturbance_fraction": 0.2,
        "context_provenance": "Synthetic test inputs; not road or disturbance observations",
    }
    (destination / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")


if __name__ == "__main__":
    generate()
