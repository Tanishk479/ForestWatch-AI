# ForestWatch numerical raster backend

Small local FastAPI service. All detections are calculated from raster pixels; there is no pretrained model, U-Net accuracy claim, automatic satellite acquisition, or hardware telemetry.

## Run (repository root)

Python 3.11+ recommended (tested on 3.12). Rasterio uses GDAL wheels; on platforms without wheels, install GDAL per Rasterio's instructions rather than disabling verification.

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```

In a second terminal:

```sh
npm ci
npm run dev
```

The existing overview and Forest monitoring pages fetch `/health`, `/analyses`, `/detections`, `/monitoring-areas`, and `/risk-scores` through the frontend's same-origin `/api/backend/` proxy. `FORESTWATCH_API_URL` (server-only, default `http://127.0.0.1:8000`) selects the backend. No browser-visible keys or cross-origin configuration are required. Restart Next.js after changing this variable. Do not point it at an untrusted service.

Open Forest monitoring: **Run synthetic fixture** computes the bundled four 16×16 test rasters, or **Analyze Sentinel-2 bands** uploads real inputs. Results, provenance, before/after NDVI comparison, georeferenced loss/change masks, and score contributions appear in the added analysis panel. Selection is independent of the original regional/date demo filters. The original dashboard, globe, demo comparison, trends, maps and device features are preserved and still explicitly labeled demo data. When backend requests fail, computed results are cleared and the page explicitly shows demo fallback. Retry/refresh reconnects without reloading the page.

No initial analysis is silently created. Results persist in `backend/data/<uuid>/`; do not commit that directory. Use `FORESTWATCH_DATA_DIR` to change it. This is a single-node local development service with no authentication, job queue or production upload quota. Bind to loopback; put authentication, overall request limits, storage quotas and job isolation in front of it before public deployment. Each raster is limited to 32 MiB and 4 million pixels; crop large Sentinel scenes first. File parsing is limited to single-band GeoTIFFs.

## Real Sentinel-2 inputs

Acquire actual Sentinel-2 L2A B04 (red) and B08 (NIR) from an authorized free source such as [Copernicus Data Space](https://dataspace.copernicus.eu/). Acquisition/download automation and account credentials are not included. No real observations are bundled or claimed as validated. The `sentinel2` source label is a user declaration, not scene authentication.

1. Select two dates for the same footprint. Use L2A surface reflectance, comparable season/processing and a clear atmospheric view. B04/B08 are normally 10 m bands.
2. Export/crop both dates to single-band GeoTIFFs on the **same dimensions, affine transform, projected metre CRS** (e.g. the correct UTM zone), and pixel alignment. GDAL `gdalwarp`/`gdal_translate`, QGIS or Rasterio can prepare SAFE/JP2 data. Align continuous reflectance appropriately; use nearest-neighbor for discrete masks. This service deliberately rejects misaligned grids instead of silently resampling.
3. Provide each date's actual scale and offset: `reflectance = DN × scale + offset`. For raw L2A DN, use the product's `BOA_QUANTIFICATION_VALUE` and band-specific `BOA_ADD_OFFSET`: scale = `1 / quantification`, offset = `add_offset / quantification`. For already calibrated reflectance, scale=1 and offset=0. **Do not apply scaling twice or assume zero offset for every processing baseline.** The UI intentionally has no calibration defaults.
4. Export both dates' cloud/shadow/snow/invalid exclusions as aligned masks (1 usable, 0 excluded), using product quality information such as SCL and appropriate cloud screening. Pass `before_valid` and `after_valid`. Nodata and invalid/zero denominator pixels are always excluded; without quality masks, results include a prominent warning and are not cloud validated.
5. Enter an externally measured nearest-road distance (metres) and historical disturbance fraction (0–1), plus their provenance if available. No road dataset or historical time series is invented. Missing either input yields **no total risk score**.

Acquisition dates, footprint names and contextual measurements are supplied by the user. Cloud screening and georegistration must be prepared upstream; vegetation change can be seasonal, atmospheric or agricultural rather than deforestation. No causal attribution is claimed.

### API example

Interactive schema and upload form: `http://127.0.0.1:8000/docs`.

```sh
curl -X POST http://127.0.0.1:8000/analyses \
  -F 'metadata={"area_name":"My measured plot","source":"sentinel2","before_date":"2026-09-01","after_date":"2026-10-01","before_scale":1,"before_offset":0,"after_scale":1,"after_offset":0}' \
  -F before_red=@/path/to/calibrated_before_B04.tif \
  -F before_nir=@/path/to/calibrated_before_B08.tif \
  -F after_red=@/path/to/calibrated_after_B04.tif \
  -F after_nir=@/path/to/calibrated_after_B08.tif \
  -F before_valid=@/path/to/before_usable_mask.tif \
  -F after_valid=@/path/to/after_usable_mask.tif
```

This example assumes **already calibrated** reflectance; change scale/offset for raw DN. To exercise the synthetic pipeline without any real observations, use `curl -X POST http://127.0.0.1:8000/analyses/sample`.

| Endpoint                                                            | Behavior                                                                                            |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET /health`                                                       | Service status and persisted analysis count                                                         |
| `POST /analyses`                                                    | Multipart upload of four bands, metadata JSON and optional quality masks; computes/persists outputs |
| `POST /analyses/sample`                                             | Recompute bundled explicitly synthetic fixture                                                      |
| `GET /analyses`, `GET /analyses/{id}`                               | Full computed statistics and provenance                                                             |
| `GET /detections`                                                   | One aggregate loss candidate per comparison with loss pixels; empty when none                       |
| `GET /monitoring-areas`                                             | One input raster footprint per analysis; not official administrative regions                        |
| `GET /risk-scores`                                                  | Scores, weights, normalization, contributions and missing context                                   |
| `GET /analyses/{id}/artifacts/{before,after,loss,change}.{png,tif}` | Rendered PNG or georeferenced floating-point GeoTIFF                                                |

Invalid input returns 422, oversized files 413, unknown results 404. There is no arbitrary local-file-path API. Invalid uploads are cleaned up. Stored inputs are retained with the analysis for reproducibility. No hardware endpoints are implemented.

## Numerical definitions and assumptions

- NDVI = `(B8 − B4) / (B8 + B4)` using calibrated reflectance. Exclude nodata, non-finite or negative reflectance, and near-zero denominators, then use the intersection of valid pixels on both dates.
- Before/after comparison displays **NDVI pseudocolor**, not RGB photography (B2/B3 are not provided).
- Baseline forest **proxy**: NDVI before ≥ 0.60. Loss candidate: baseline proxy AND NDVI after < 0.60 AND (after − before) ≤ −0.20. Thresholds can be set in metadata; these are engineering defaults, not a trained forest classifier or validated forest definition.
- NDVI change = after − before. Mean decline for scoring = mean of `max(before − after, 0)` over baseline forest proxy pixels (including unchanged baseline pixels).
- Pixel area = `abs(a*e − b*d)` from the projected affine transform, in m²; affected hectares = count(loss pixels) × pixel area / 10,000. Geographic degree CRSs and non-metre units are rejected. Areas are projected grid areas; they are not corrected for projection distortion or terrain slope. Valid-area denominator excludes masked pixels, so this is not whole-scene coverage when clouds exist.
- Bounds in WGS84 describe the **entire raster footprint**, not a detected clearing polygon. Download the loss GeoTIFF for actual affected pixels. No confidence or neural-network accuracy is fabricated.
- PNGs: NDVI brown/low→green/high over −1 to +1; loss orange=candidate, dark green=other valid pixels; change red=decline, green=increase, saturated at magnitude 0.5. Transparent/GeoTIFF −9999 = excluded, never zero loss.

### Explainable risk (0–100)

`score = 100 × (0.35 L + 0.30 N + 0.20 R + 0.15 H)`

- `L = clip((loss pixels / baseline forest pixels) / 0.10, 0, 1)`
- `N = clip(mean positive NDVI decline / 0.30, 0, 1)`
- `R = clip(1 − road distance metres / 1000, 0, 1)`
- `H = supplied historical disturbance fraction (0–1)`

The **35/30/20/15 weights were supplied by the user**. No research paper was present in this checkout, so attribution/validation against the paper is unverified. The fraction-based loss normalization, saturation thresholds and road influence distance are explicit engineering assumptions, not claimed paper parameters. History's spatial extent and lookback window must be supplied in context provenance. This score is a heuristic for screening, not calibrated probability or operational advice. It is incomplete (null) when contextual inputs are missing or no valid baseline forest proxy pixels exist; components remain explainable. Loss-area normalization is relative to baseline forest, not absolute hectares.

## Fixtures and tests

```sh
.venv/bin/python -m pytest backend/tests -q
# Optional full frontend proxy → backend test (both services running; creates a synthetic record):
npm run verify:analysis
# Recreate the committed synthetic input TIFFs if needed:
.venv/bin/python -m backend.fixtures
```

Synthetic fixture: 256 valid 10×10 m pixels, before NDVI=0.75; 16 pixels decline to NDVI=0.20. Expected loss=0.16 ha, mean change=−0.034375 and risk=43.31 using explicitly synthetic road/history values. Tests calculate these from file bytes and verify zero change, masks/nodata, calibration, invalid/misaligned grids, missing context, score bounds, HTTP endpoints, persistence and output GeoTIFFs. These fixture dates and locations are not satellite observations.
