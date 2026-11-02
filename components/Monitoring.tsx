"use client";
import AnalysisPanel from "./AnalysisPanel";
import { useState } from "react";
import { Download, ArrowUpRight, ScanLine } from "lucide-react";
import { useMonitor } from "./Shell";
import { sites, downloadCSV } from "@/lib/data";
import { TrendChart } from "./Dashboard";
export default function Monitoring() {
  const { region, period } = useMonitor();
  const [position, setPosition] = useState(50);
  const [zone, setZone] = useState("Northern buffer");
  const [tab, setTab] = useState("All changes");
  const changes = [
    { name: "Northern buffer", type: "Canopy loss", area: 8.2, confidence: 94 },
    { name: "River corridor", type: "Regrowth", area: 5.6, confidence: 91 },
    { name: "Eastern trail", type: "Canopy loss", area: 6.4, confidence: 88 },
    { name: "Southern ridge", type: "Canopy loss", area: 4, confidence: 90 },
  ];
  const filtered = changes.filter(
    (x) => tab === "All changes" || x.type === tab,
  );
  return (
    <>
      <AnalysisPanel expanded />
      <div className="section-toolbar">
        <div>
          <h2>Landscape change analysis</h2>
          <p className="subtle">
            {region} · {period} · Illustrative classification
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() =>
            downloadCSV("forestwatch-sample-changes.csv", [
              ["SAMPLE DATA", region, period],
              ["Zone", "Change", "Area ha", "Confidence %"],
              ...changes.map((x) => [x.name, x.type, x.area, x.confidence]),
            ])
          }
        >
          <Download size={15} /> Export report
        </button>
      </div>
      <div className="monitor-grid">
        <section className="panel comparison-panel">
          <div className="panel-header">
            <div>
              <h2>One landscape. Two moments.</h2>
              <p>
                {zone} · Synthetic aerial illustration, not satellite imagery
              </p>
            </div>
            <ScanLine size={19} />
          </div>
          <div
            className="comparison"
            role="img"
            aria-label={`Before and after synthetic forest illustration for ${zone}, split at ${position}%`}
          >
            <div className="forest-image after-image" />
            <div className="before-clip" style={{ width: `${position}%` }}>
              <div className="forest-image before-image" />
            </div>
            <span className="image-label before-label">
              BEFORE <small>04 Oct 2026</small>
            </span>
            <span className="image-label after-label">
              AFTER <small>03 Nov 2026</small>
            </span>
            <div className="comparison-line" style={{ left: `${position}%` }}>
              <span>‹ ›</span>
            </div>
          </div>
          <label className="comparison-control">
            Compare forest cover{" "}
            <input
              aria-label="Before and after comparison"
              type="range"
              min="0"
              max="100"
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
            />
            <span>{position}% before</span>
          </label>
          <div className="comparison-note">
            <span className="online-dot" /> Drag the slider to explore simulated
            canopy loss.
          </div>
        </section>
        <section className="panel summary-panel">
          <div className="section-eyebrow">LANDSCAPE SNAPSHOT</div>
          <h2>Changes worth watching.</h2>
          <div className="summary-metric">
            <span>Healthy canopy</span>
            <strong>
              {sites[region].canopy}
              <small>%</small>
            </strong>
          </div>
          <div className="summary-metric">
            <span>Estimated loss · 30-day baseline</span>
            <strong>
              {sites[region].change}
              <small> ha</small>
            </strong>
          </div>
          <div className="summary-metric">
            <span>Sample regrowth · 30-day baseline</span>
            <strong className="green">
              5.6<small> ha</small>
            </strong>
          </div>
          <p className="subtle">
            Illustrative estimates only. These figures are not evidence of
            actual deforestation.
          </p>
        </section>
      </div>
      <section className="panel">
        <div className="panel-header">
          <h2>Detected changes</h2>
          <div className="filter-tabs">
            {["All changes", "Canopy loss", "Regrowth"].map((t) => (
              <button
                className={t === tab ? "selected" : ""}
                key={t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Monitoring zone</th>
                <th>Classification</th>
                <th>Area · 30-day baseline</th>
                <th>Confidence</th>
                <th>Comparison</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((x) => (
                <tr key={x.name}>
                  <td>
                    <span className="table-icon">
                      <TreesIcon />
                      {x.name}
                    </span>
                  </td>
                  <td>
                    <span className={x.type === "Regrowth" ? "green" : "amber"}>
                      {x.type}
                    </span>
                  </td>
                  <td>{x.area.toFixed(1)} ha</td>
                  <td>
                    <span className="confidence-bar">
                      <i style={{ width: `${x.confidence}%` }} />
                    </span>
                    {x.confidence}%
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => {
                        setZone(x.name);
                        setPosition(50);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Inspect <ArrowUpRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel monitoring-trend">
        <div className="panel-header">
          <div>
            <h2>Canopy health over time</h2>
            <p>Sample trend · {period}</p>
          </div>
          <span className="chart-legend">
            <i /> Healthy canopy
          </span>
        </div>
        <TrendChart />
      </section>
    </>
  );
}
function TreesIcon() {
  return <span className="zone-icon">⌁</span>;
}
