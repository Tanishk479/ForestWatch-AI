"use client";
import Modal from "./Modal";
import { useState } from "react";
import {
  Battery,
  Radio,
  Search,
  Download,
  X,
  RefreshCw,
  Wifi,
  Cpu,
} from "lucide-react";
import { devices, downloadCSV } from "@/lib/data";
import { useMonitor } from "./Shell";
export default function Devices() {
  const { region } = useMonitor();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [selected, setSelected] = useState<(typeof devices)[number] | null>(
    null,
  );
  const [refreshed, setRefreshed] = useState(false);
  const filtered = devices.filter(
    (d) =>
      (status === "All statuses" || d.status === status) &&
      `${d.id} ${d.name} ${d.kind}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="device-summary">
        {[
          { icon: Radio, label: "Simulated devices", value: "06" },
          { icon: Wifi, label: "Online", value: "04" },
          { icon: Battery, label: "Low battery", value: "01" },
          { icon: Cpu, label: "Offline", value: "01" },
        ].map(({ icon: Icon, label, value }) => (
          <section className="panel device-stat" key={label}>
            <Icon size={20} />
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          </section>
        ))}
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Device network</h2>
            <p>{region} · No hardware connected</p>
          </div>
          <button
            className="secondary-button"
            onClick={() =>
              downloadCSV("forestwatch-sample-devices.csv", [
                ["SAMPLE DEVICES", region],
                ["ID", "Name", "Status", "Battery %"],
                ...devices.map((d) => [d.id, d.name, d.status, d.battery]),
              ])
            }
          >
            <Download size={15} /> Export devices
          </button>
        </div>
        <div className="device-filters">
          <label className="search-input">
            <Search size={16} />
            <input
              placeholder="Search devices…"
              aria-label="Search devices"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter device status"
            className="standalone-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {["All statuses", "Online", "Low battery", "Offline"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            className="secondary-button"
            onClick={() => setRefreshed(true)}
          >
            <RefreshCw size={14} /> Refresh sample
          </button>
        </div>
        {refreshed && (
          <div className="inline-message" role="status">
            Sample snapshot refreshed locally. No live device connection is
            configured.
          </div>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Device</th>
                <th>Status</th>
                <th>Battery</th>
                <th>Signal</th>
                <th>Last sample</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="device-name">
                      <span className="device-icon">
                        <Radio size={18} />
                      </span>
                      <div>
                        <strong>{d.name}</strong>
                        <small>
                          {d.id} · {d.kind}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${d.status === "Online" ? "online" : d.status === "Offline" ? "offline" : "low"}`}
                    >
                      <i />
                      {d.status}
                    </span>
                  </td>
                  <td>
                    <span className={d.battery < 20 ? "amber" : ""}>
                      <Battery size={15} className="inline-icon" /> {d.battery}%
                    </span>
                  </td>
                  <td>{d.signal ? `${d.signal} dBm` : "Unavailable"}</td>
                  <td className="subtle">{d.seen}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => setSelected(d)}
                    >
                      View details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <Search size={28} />
              <h3>No devices found</h3>
              <p>Try another name or status.</p>
              <button
                className="secondary-button"
                onClick={() => {
                  setSearch("");
                  setStatus("All statuses");
                }}
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
        <div className="table-foot">
          Showing {filtered.length} of {devices.length} simulated devices
        </div>
      </section>
      <div className="hardware-note">
        <Radio size={22} />
        <div>
          <h3>A preview of a connected forest.</h3>
          <p>
            Device telemetry is realistic sample data. Hardware provisioning,
            remote commands, and physical sensors are outside this demo.
          </p>
        </div>
      </div>
      {selected && (
        <Modal onClose={() => setSelected(null)} labelledBy="device-title">
          <button
            autoFocus
            className="icon-button modal-close"
            aria-label="Close device details"
            onClick={() => setSelected(null)}
          >
            <X size={20} />
          </button>
          <span className="section-eyebrow">SIMULATED DEVICE</span>
          <h2 id="device-title">{selected.name}</h2>
          <p>
            {selected.id} · {selected.kind}
          </p>
          <dl>
            <dt>Region</dt>
            <dd>{region}</dd>
            <dt>Status</dt>
            <dd>{selected.status}</dd>
            <dt>Battery</dt>
            <dd>{selected.battery}%</dd>
            <dt>Signal</dt>
            <dd>
              {selected.signal
                ? `${selected.signal} dBm`
                : "Unavailable while offline"}
            </dd>
            <dt>Last sample</dt>
            <dd>{selected.seen}</dd>
          </dl>
          <div className="inline-message">
            {selected.status === "Offline"
              ? "This sample device is offline. Telemetry is unavailable."
              : "Sample telemetry: 24.8°C · 78% humidity · firmware 2.4.1"}
          </div>
          <button
            className="secondary-button"
            onClick={() => setSelected(null)}
          >
            Close details
          </button>
        </Modal>
      )}
    </>
  );
}
