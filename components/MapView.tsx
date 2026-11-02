"use client";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polygon,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { alerts, devices, Region, sites } from "@/lib/data";
function Position({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 11);
  }, [map, center]);
  return null;
}
export default function MapView({
  region,
  layer = "alerts",
}: {
  region: Region;
  layer?: string;
}) {
  const center = sites[region].center;
  const [tileError, setTileError] = useState(false);
  const boundary: [number, number][] = [
    [center[0] + 0.09, center[1] - 0.08],
    [center[0] + 0.08, center[1] + 0.09],
    [center[0] - 0.07, center[1] + 0.1],
    [center[0] - 0.09, center[1] - 0.06],
  ];
  return (
    <div className="map-container">
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <Position center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false),
          }}
        />
        <Polygon
          positions={boundary}
          pathOptions={{
            color: "#48dca0",
            weight: 1.5,
            fillOpacity: 0.09,
            dashArray: "5 7",
          }}
        >
          <Popup>
            <strong>{region} sample monitoring zone</strong>
            <br />
            Illustrative boundary; not an official protected area.
          </Popup>
        </Polygon>
        {layer === "alerts"
          ? alerts.map((a) => (
              <CircleMarker
                key={a.id}
                center={[center[0] + a.offset[0], center[1] + a.offset[1]]}
                radius={9}
                pathOptions={{
                  color:
                    a.severity === "Critical"
                      ? "#ff8b72"
                      : a.severity === "Warning"
                        ? "#e9c270"
                        : "#65d9b0",
                  fillOpacity: 0.8,
                  weight: 2,
                }}
              >
                <Popup>
                  <strong>{a.title}</strong>
                  <p>{a.detail}</p>
                  {a.location} · Sample event
                </Popup>
              </CircleMarker>
            ))
          : devices.map((d) => (
              <CircleMarker
                key={d.id}
                center={[center[0] + d.offset[0], center[1] + d.offset[1]]}
                radius={7}
                pathOptions={{
                  color: d.status === "Online" ? "#65d9b0" : "#e9c270",
                  fillOpacity: 0.8,
                }}
              >
                <Popup>
                  <strong>{d.name}</strong>
                  <p>
                    {d.id} · {d.status}
                  </p>
                  Simulated device · {d.battery}% battery
                </Popup>
              </CircleMarker>
            ))}
      </MapContainer>
      {tileError && (
        <div className="map-error" role="status">
          Basemap could not load. Check internet access to
          basemaps.cartocdn.com. Sample overlays remain available.
        </div>
      )}
    </div>
  );
}
