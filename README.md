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

Region selection updates regional metrics and map coordinates. Period selection changes the overview sample trend and loss estimate. Monitoring zone areas are explicitly labeled as 30-day baseline values. Alert review state is local to the current overview page session. There is no authentication, backend storage, hardware integration, or paid API.

## Sample data and imagery

**Every KPI, alert, device, boundary, location offset, and trend is illustrative sample data**, not live forest intelligence. The profile is fictional. Dates refer to the fixed demo snapshot of 3 November 2026. `lib/data.ts` holds the sample dataset. The before/after image is a locally generated synthetic forest illustration; it is not satellite imagery. The globe uses procedural points and does not claim accurate continent outlines. Its graphics load exclusively on the client through dynamic imports (`ssr: false`); unsupported WebGL shows a fallback.

The 2D map uses real OpenStreetMap geography through CARTO's free public raster basemap, with visible attribution. Internet access to `a.basemaps.cartocdn.com`, `b.basemaps.cartocdn.com`, and `c.basemaps.cartocdn.com` is required for tiles. No API key is needed. A tile error banner appears if the basemap is unavailable; sample overlays remain usable. Observe [CARTO attribution and basemap terms](https://carto.com/attributions) and [OpenStreetMap attribution](https://www.openstreetmap.org/copyright) for production use. The application itself can build without tile access or external fonts.

## Development notes

- `app/` defines routes, global styles, loading/error/not-found states.
- `components/` contains the shell, views, client-only globe and Leaflet map.
- `public/forest-sample.svg` is the synthetic comparison asset.
- Layouts adapt to desktop, tablet and mobile with a collapsible navigation drawer.
- CSV exports run locally. Demo controls never issue physical device commands.
- Use the existing checkout in cloud tasks; no additional worktree is necessary.
