"use client";
import Modal from "./Modal";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Trees,
  ScanLine,
  Radio,
  TriangleAlert,
  Maximize2,
  Download,
  ChevronRight,
  Layers,
  Activity,
  X,
  Check,
} from "lucide-react";
import { alerts, downloadCSV, sites } from "@/lib/data";
import { useMonitor } from "./Shell";
import VisualBoundary from "./VisualBoundary";
const Globe = dynamic(() => import("./Globe"), {
  ssr: false,
  loading: () => <div className="visual-fallback">Preparing the planet…</div>,
});
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="visual-fallback">Loading geospatial map…</div>,
});
export function TrendChart() {
  const { period } = useMonitor();
  const values =
    period === "Last 7 days"
      ? [44, 48, 45, 60, 57, 68, 72]
      : period === "Last 90 days"
        ? [28, 36, 32, 45, 40, 58, 52, 64, 67, 62, 77, 80]
        : [44, 50, 47, 54, 49, 60, 56, 66, 64, 72, 69, 78];
  const points = values
    .map((v, i) => `${(i * 600) / (values.length - 1)},${130 - v}`)
    .join(" ");
  return (
    <div className="trend-chart">
      <div className="chart-scale">
        <span>100%</span>
        <span>90%</span>
        <span>80%</span>
      </div>
      <svg
        viewBox="0 0 600 130"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Illustrative canopy health trend for ${period}`}
      >
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#39d695" stopOpacity=".24" />
            <stop offset="100%" stopColor="#39d695" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 65, 110].map((y) => (
          <line
            key={y}
            x1="0"
            x2="600"
            y1={y}
            y2={y}
            stroke="#ffffff0c"
            strokeDasharray="4 5"
          />
        ))}
        <polygon points={`0,130 ${points} 600,130`} fill="url(#area)" />
        <polyline
          points={points}
          fill="none"
          stroke="#52dda5"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="chart-dates">
        <span>Period start</span>
        <span>Midpoint</span>
        <span>Period end</span>
      </div>
    </div>
  );
}
export default function Dashboard() {
  const { region, period } = useMonitor();
  const [view, setView] = useState("3d");
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<(typeof alerts)[number] | null>(
    null,
  );
  const [reviewed, setReviewed] = useState<string[]>([]);
  const site = sites[region];
  const factor =
    period === "Last 7 days" ? 0.3 : period === "Last 90 days" ? 2.6 : 1;
  return (
    <>
      <div className="kpi-grid">
        {[
          {
            label: "Forest area monitored",
            value: site.area,
            unit: "ha",
            delta: "+2.8%",
            text: "vs. previous period",
            icon: Trees,
            color: "green",
          },
          {
            label: "Healthy canopy cover",
            value: site.canopy,
            unit: "%",
            delta: "+1.2%",
            text: "vs. previous period",
            icon: ScanLine,
            color: "green",
          },
          {
            label: "Active sample alerts",
            value: String(4 - reviewed.length).padStart(2, "0"),
            unit: "",
            delta: "2 priority",
            text: "require review",
            icon: TriangleAlert,
            color: "amber",
          },
          {
            label: "Devices online",
            value: "04",
            unit: "/ 06",
            delta: "66.7%",
            text: "network availability",
            icon: Radio,
            color: "green",
          },
        ].map(({ label, value, unit, delta, text, icon: Icon, color }) => (
          <section className="kpi-card" key={label}>
            <div className="kpi-top">
              <span>{label}</span>
              <Icon size={17} />
            </div>
            <div className="kpi-value">
              {value}
              <span>{unit}</span>
            </div>
            <div className="kpi-bottom">
              <span className={color}>
                {color === "green" ? (
                  <ArrowUpRight size={13} />
                ) : (
                  <span className="tiny-dot" />
                )}
                {delta}
              </span>
              <span>{text}</span>
            </div>
          </section>
        ))}
      </div>
      <div className="overview-grid">
        <section
          className={`panel globe-panel ${expanded ? "expanded-visual" : ""}`}
        >
          <div className="panel-header">
            <div>
              <div className="section-eyebrow">THE BIG PICTURE</div>
              <h2>Forest intelligence, in orbit.</h2>
              <p>Connected insights. Grounded in conservation.</p>
            </div>
            <button
              className="icon-button"
              aria-label={
                expanded ? "Exit expanded view" : "Expand visualization"
              }
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <X size={17} /> : <Maximize2 size={16} />}
            </button>
          </div>
          <div className="visual-tabs">
            <button
              className={view === "3d" ? "selected" : ""}
              onClick={() => setView("3d")}
            >
              3D globe
            </button>
            <button
              className={view === "2d" ? "selected" : ""}
              onClick={() => setView("2d")}
            >
              2D map
            </button>
          </div>
          <div className="globe-stage">
            <VisualBoundary>
              {view === "3d" ? <Globe /> : <MapView region={region} />}
            </VisualBoundary>
            {view === "3d" && (
              <>
                <div className="orbit-label label-one">
                  <span className="online-dot" /> {region}
                  <small>Sample monitoring region</small>
                </div>
                <div className="globe-coordinate">
                  GLOBAL PERSPECTIVE <span>↗</span>
                </div>
              </>
            )}
          </div>
          <div className="globe-bottom">
            <div>
              <span className="online-dot" />{" "}
              {view === "3d"
                ? "Drag to rotate · Scroll to zoom"
                : "Click an event to inspect"}
            </div>
            <span>
              <Layers size={13} /> {region}
            </span>
          </div>
        </section>
        <section className="panel alert-panel">
          <div className="panel-header">
            <div>
              <div className="section-eyebrow">ON YOUR RADAR</div>
              <h2>
                Alert timeline{" "}
                <span className="count-badge">{4 - reviewed.length}</span>
              </h2>
            </div>
            <span className="subtle">Sample events</span>
          </div>
          <div className="timeline">
            {alerts.map((a) => (
              <button
                className={`timeline-event ${reviewed.includes(a.id) ? "reviewed" : ""}`}
                key={a.id}
                onClick={() => setSelected(a)}
              >
                <span className={`timeline-dot ${a.severity.toLowerCase()}`} />
                <div className="event-top">
                  <span className={`severity ${a.severity.toLowerCase()}`}>
                    {reviewed.includes(a.id) ? "Reviewed" : a.severity}
                  </span>
                  <time>{a.time}</time>
                </div>
                <h3>{a.title}</h3>
                <p>
                  {a.location} <span>·</span> {region}
                </p>
                <ChevronRight size={14} className="event-arrow" />
              </button>
            ))}
          </div>
          <Link href="/map" className="panel-footer-link">
            Explore events on map <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
      <div className="lower-grid">
        <section className="panel health-panel">
          <div className="panel-header">
            <div>
              <h2>Canopy health trend</h2>
              <p>A little greener, every day.</p>
            </div>
            <span className="chart-legend">
              <i /> Healthy canopy
            </span>
          </div>
          <div className="health-number">
            {site.canopy}
            <span>%</span>
            <small>
              <ArrowUpRight size={14} /> 1.2% this period
            </small>
          </div>
          <TrendChart />
        </section>
        <section className="panel impact-panel">
          <div className="panel-header">
            <div>
              <h2>Change in focus</h2>
              <p>Small changes. Meaningful signals.</p>
            </div>
            <Activity size={18} />
          </div>
          <div className="change-stat">
            <span>
              {(Number(site.change) * factor).toFixed(1)}
              <small> ha</small>
            </span>
            <span className="amber">
              <ArrowDownRight size={14} /> Canopy loss
            </span>
          </div>
          <div className="segmented-bar">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <p className="impact-description">
            Sample change estimates for {region} over the {period.toLowerCase()}
            .
          </p>
          <div className="impact-actions">
            <Link href="/monitoring" className="primary-button">
              Investigate changes <ArrowUpRight size={15} />
            </Link>
            <button
              className="icon-button bordered"
              aria-label="Download sample monitoring report"
              onClick={() =>
                downloadCSV("forestwatch-sample-report.csv", [
                  ["SAMPLE DATA", region, period],
                  ["Metric", "Value"],
                  ["Monitored hectares", site.area],
                  ["Healthy canopy %", site.canopy],
                  [
                    "Estimated canopy loss ha",
                    (Number(site.change) * factor).toFixed(1),
                  ],
                ])
              }
            >
              <Download size={16} />
            </button>
          </div>
        </section>
      </div>
      {selected && (
        <Modal onClose={() => setSelected(null)} labelledBy="alert-title">
          <button
            autoFocus
            className="icon-button modal-close"
            aria-label="Close event details"
            onClick={() => setSelected(null)}
          >
            <X size={20} />
          </button>
          <span className={`severity ${selected.severity.toLowerCase()}`}>
            {selected.severity} · Sample event
          </span>
          <h2 id="alert-title">{selected.title}</h2>
          <p>{selected.detail}</p>
          <dl>
            <dt>Event ID</dt>
            <dd>{selected.id}</dd>
            <dt>Location</dt>
            <dd>
              {region} / {selected.location}
            </dd>
            <dt>Observed</dt>
            <dd>03 Nov 2026 · {selected.time} IST</dd>
          </dl>
          <button
            className="primary-button"
            disabled={reviewed.includes(selected.id)}
            onClick={() => {
              setReviewed([...reviewed, selected.id]);
              setSelected(null);
            }}
          >
            <Check size={16} />
            {reviewed.includes(selected.id)
              ? "Already reviewed"
              : "Mark reviewed locally"}
          </button>
          <p className="subtle">
            Review state lasts for this page session only.
          </p>
        </Modal>
      )}
    </>
  );
}
