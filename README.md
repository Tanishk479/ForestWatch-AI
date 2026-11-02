# ForestWatch AI

A responsive forest-monitoring command center built with Next.js App Router, TypeScript, Tailwind CSS, Three.js, React Three Fiber, Drei, and Leaflet. Dark emerald interface, interactive 3D globe, real geographic basemap, change comparison, alert review, and simulated device monitoring.

## Run locally

Requires Node.js 22 or newer and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. To run a production build:

```sh
npm run build
npm start
```

Checks:

```sh
npm run lint
npm run typecheck
npm run build
```

## Explore

- **Overview** (`/`): regional KPIs, draggable/zoomable 3D globe, 2D map toggle, expanded visualization, sample alert details and local review state, canopy trend, CSV report.
- **Forest monitoring** (`/monitoring`): adjustable before/after comparison, change classifications, zone inspection, filtering, CSV export.
- **Geospatial map** (`/map`): Leaflet map with pan/zoom, switchable event/device layers, clickable markers, illustrative monitoring boundary. Region selection recenters the map.
- **Device network** (`/devices`): searchable/filterable simulated inventory, battery/signal/status, device details, empty states, sample refresh and CSV export.

Region selection updates regional metrics and map coordinates. Period selection changes the overview sample trend and loss estimate. Monitoring zone areas are explicitly labeled as 30-day baseline values. Alert review state is local to the current overview page session. The original demo views have no authentication or hardware integration and use no paid API. The optional raster backend stores analysis inputs/results locally (see below).

## Sample data and imagery

**Every original regional KPI, alert, device, boundary, location offset, and trend is illustrative sample data**, not live forest intelligence. The profile is fictional. Dates refer to the fixed demo snapshot of 3 November 2026. `lib/data.ts` holds the sample dataset. The original demo before/after image is a locally generated synthetic forest illustration; it is not satellite imagery. The globe uses procedural points and does not claim accurate continent outlines. Its graphics load exclusively on the client through dynamic imports (`ssr: false`); unsupported WebGL shows a fallback.

The 2D map uses real OpenStreetMap geography through CARTO's free public raster basemap, with visible attribution. Internet access to `a.basemaps.cartocdn.com`, `b.basemaps.cartocdn.com`, and `c.basemaps.cartocdn.com` is required for tiles. No API key is needed. A tile error banner appears if the basemap is unavailable; sample overlays remain usable. Observe [CARTO attribution and basemap terms](https://carto.com/attributions) and [OpenStreetMap attribution](https://www.openstreetmap.org/copyright) for production use. The application itself can build without tile access or external fonts.

## Development notes

- `app/` defines routes, global styles, loading/error/not-found states.
- `components/` contains the shell, views, client-only globe and Leaflet map.
- `public/forest-sample.svg` is the synthetic comparison asset.
- Layouts adapt to desktop, tablet and mobile with a collapsible navigation drawer.
- CSV exports run locally. Demo controls never issue physical device commands.
- Use the existing checkout in cloud tasks; no additional worktree is necessary.

## Verify production routes

With `npm run build` completed and `npm start` running in another terminal:

```sh
npm run verify:routes
# Or specify a different server address:
npm run verify:routes -- http://127.0.0.1:3002
```

This dependency-free smoke check verifies HTTP 200, route-specific content, sample-data labels, and absence of server-rendered Three.js/Leaflet containers on all four routes. It does not replace browser checks for WebGL rendering, hydration, navigation, or external map tiles.

## Python raster backend (optional)

The existing dashboard now includes a numerical analysis panel; its 3D design and original demo views are preserved. Real, user-provided Sentinel-2 B4/B8 raster pairs can be analyzed without a paid API. The committed tiny test rasters are **synthetic fixtures, not satellite observations**. No trained-model accuracy or live hardware data is claimed.

Run both services from the repository root, in separate terminals:

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```

```sh
npm ci
npm run dev
```

Open Forest monitoring to run the synthetic fixture or upload prepared real bands. Stop the backend to verify the labeled demo fallback, then use Retry / refresh after restarting. Computed comparisons are independent scene analyses; original regional/date controls still apply only to original demo views. Server-side proxy target defaults to `http://127.0.0.1:8000` (`FORESTWATCH_API_URL` override).

Backend tests: `.venv/bin/python -m pytest backend/tests -q`. See [backend/README.md](backend/README.md) for input calibration, cloud masking, endpoint contracts, scoring assumptions, limitations and artifacts. The requested 35/30/20/15 risk weights are used; no paper was supplied to verify its normalization or methodology.
