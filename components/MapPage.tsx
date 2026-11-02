"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Layers, MapPin, Info } from "lucide-react";
import { useMonitor } from "./Shell";
import { sites } from "@/lib/data";
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="visual-fallback">Loading map…</div>,
});
export default function MapPage() {
  const { region } = useMonitor();
  const [layer, setLayer] = useState("alerts");
  return (
    <>
      <div className="section-toolbar">
        <div>
          <h2>Geospatial explorer</h2>
          <p className="subtle">
            Real basemap · Illustrative monitoring overlays
          </p>
        </div>
        <div className="filter-tabs">
          <button
            className={layer === "alerts" ? "selected" : ""}
            onClick={() => setLayer("alerts")}
          >
            Alert events
          </button>
          <button
            className={layer === "devices" ? "selected" : ""}
            onClick={() => setLayer("devices")}
          >
            Device network
          </button>
        </div>
      </div>
      <section className="panel full-map">
        <MapView region={region} layer={layer} />
      </section>
      <div className="map-details">
        <div className="panel map-detail">
          <MapPin size={19} />
          <div>
            <h3>{region}</h3>
            <p>
              {sites[region].center.map((c) => c.toFixed(3)).join(", ")} · WGS84
            </p>
          </div>
        </div>
        <div className="panel map-detail">
          <Layers size={19} />
          <div>
            <h3>
              {layer === "alerts" ? "4 sample events" : "6 simulated devices"}
            </h3>
            <p>Click a marker for details · Use + / − to zoom</p>
          </div>
        </div>
        <div className="panel map-detail">
          <Info size={19} />
          <div>
            <h3>Illustrative boundary</h3>
            <p>Not an official survey or conservation designation.</p>
          </div>
        </div>
      </div>
      <div className="map-legend">
        <span>
          <i className="critical-dot" /> Critical
        </span>
        <span>
          <i className="warning-dot" /> Warning / attention
        </span>
        <span>
          <i className="healthy-dot" /> Info / online
        </span>
        <span>Basemap: OpenStreetMap contributors / CARTO</span>
      </div>
    </>
  );
}
