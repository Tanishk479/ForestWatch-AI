"use client";
/* NDVI rasters are backend-generated local artifacts; Next image optimization is unnecessary. */
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Download, RefreshCw, Upload, FlaskConical } from "lucide-react";
import { Analysis, ApiError, api, artifactUrl } from "@/lib/analysis";
import { useAnalysis } from "./AnalysisProvider";

export default function AnalysisPanel({
  expanded = false,
}: {
  expanded?: boolean;
}) {
  const { status, error, snapshot, selected, select, reload } = useAnalysis();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [position, setPosition] = useState(50);
  const [uploadOpen, setUploadOpen] = useState(false);
  async function sample() {
    setBusy(true);
    setActionError("");
    try {
      const record = await api<Analysis>("/analyses/sample", {
        method: "POST",
      });
      await reload(record.id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Analysis failed");
      if (!(e instanceof ApiError) || e.status >= 500) await reload();
    } finally {
      setBusy(false);
    }
  }
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const payload = new FormData();
    for (const name of [
      "before_red",
      "before_nir",
      "after_red",
      "after_nir",
      "before_valid",
      "after_valid",
    ]) {
      const file = fields.get(name);
      if (file instanceof File && file.size) payload.append(name, file);
    }
    const optional = (name: string) =>
      fields.get(name) === "" ? null : Number(fields.get(name));
    payload.append(
      "metadata",
      JSON.stringify({
        area_name: fields.get("area_name"),
        source: "sentinel2",
        before_date: fields.get("before_date"),
        after_date: fields.get("after_date"),
        before_scale: Number(fields.get("before_scale")),
        before_offset: Number(fields.get("before_offset")),
        after_scale: Number(fields.get("after_scale")),
        after_offset: Number(fields.get("after_offset")),
        road_distance_m: optional("road_distance_m"),
        historical_disturbance_fraction: optional(
          "historical_disturbance_fraction",
        ),
        context_provenance: fields.get("context_provenance") || "Not supplied",
      }),
    );
    setBusy(true);
    setActionError("");
    try {
      const record = await api<Analysis>("/analyses", {
        method: "POST",
        body: payload,
      });
      await reload(record.id);
      setUploadOpen(false);
      form.reset();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Upload failed");
      if (!(e instanceof ApiError) || e.status >= 500) await reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="panel raster-panel"
      aria-label="Raster analysis service"
    >
      <div className="panel-header">
        <div>
          <div className="section-eyebrow">NUMERICAL RASTER ANALYSIS</div>
          <h2>
            {status === "online"
              ? "Analysis backend connected"
              : status === "loading"
                ? "Connecting to raster backend…"
                : "Backend offline · demo fallback"}
          </h2>
          <p>
            {status === "online"
              ? `${snapshot.areas.length} raster footprints · ${snapshot.detections.length} aggregate loss candidates · ${snapshot.risks.length} risk assessments`
              : "Existing dashboard values below remain illustrative demo data. No satellite observations are being claimed."}
          </p>
        </div>
        <button
          className="secondary-button"
          disabled={busy || status === "loading"}
          onClick={() => void reload()}
        >
          <RefreshCw size={14} /> Retry / refresh
        </button>
      </div>
      {status === "offline" && (
        <p className="raster-note" role="status">
          {error}
        </p>
      )}
      {status === "online" && (
        <div className="raster-controls">
          <label>
            Computed comparison{" "}
            <select
              aria-label="Computed comparison"
              value={selected?.id ?? ""}
              onChange={(e) => select(e.target.value)}
            >
              <option value="" disabled>
                No analyses yet
              </option>
              {snapshot.analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.is_demo ? "SYNTHETIC TEST" : "USER RASTERS"} ·{" "}
                  {a.metadata.area_name} · {a.metadata.after_date}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void sample()}
          >
            <FlaskConical size={14} />
            {busy ? "Computing…" : "Run synthetic fixture"}
          </button>
          {expanded && (
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => setUploadOpen(!uploadOpen)}
            >
              <Upload size={14} />
              {uploadOpen ? "Close upload" : "Analyze Sentinel-2 bands"}
            </button>
          )}
        </div>
      )}
      {actionError && (
        <p role="alert" className="raster-note amber">
          {actionError}
        </p>
      )}
      {uploadOpen && status === "online" && (
        <form className="raster-upload" onSubmit={upload}>
          <p>
            Upload co-registered, single-band B4 (red) and B8 (NIR) GeoTIFFs in
            a projected metre CRS. Supply calibration from each product’s
            metadata (reflectance = DN × scale + offset). Raw SAFE/JP2 products
            must be cropped/exported first. No automatic satellite download.
          </p>
          <div className="raster-form-grid">
            <label>
              Area name
              <input required name="area_name" maxLength={120} />
            </label>
            <label>
              Before acquisition
              <input required type="date" name="before_date" />
            </label>
            <label>
              After acquisition
              <input required type="date" name="after_date" />
            </label>
            {["before_red", "before_nir", "after_red", "after_nir"].map(
              (name) => (
                <label key={name}>
                  {name.replaceAll("_", " ")} · GeoTIFF
                  <input required type="file" name={name} accept=".tif,.tiff" />
                </label>
              ),
            )}
            {["before_valid", "after_valid"].map((name) => (
              <label key={name}>
                {name.replaceAll("_", " ")} · Optional mask
                <input type="file" name={name} accept=".tif,.tiff" />
              </label>
            ))}
            {[
              "before_scale",
              "before_offset",
              "after_scale",
              "after_offset",
            ].map((name) => (
              <label key={name}>
                {name.replaceAll("_", " ")}
                <input
                  required
                  name={name}
                  type="number"
                  step="any"
                  placeholder={
                    name.endsWith("scale")
                      ? "e.g. 0.0001 — verify product"
                      : "e.g. -0.1 or 0 — verify product"
                  }
                />
              </label>
            ))}
            <label>
              Road distance (m) · Optional
              <input name="road_distance_m" type="number" min="0" step="any" />
            </label>
            <label>
              Historical disturbance (0–1) · Optional
              <input
                name="historical_disturbance_fraction"
                type="number"
                min="0"
                max="1"
                step="any"
              />
            </label>
            <label>
              Context provenance
              <input
                name="context_provenance"
                placeholder="Road/history source, date and method"
                maxLength={500}
              />
            </label>
          </div>
          <p>
            Masks: 1 = clear/usable, 0 = exclude cloud, shadow, snow or invalid
            pixels. Missing context yields an incomplete risk score. This is
            threshold screening, not a trained forest classifier.
          </p>
          <button className="primary-button" disabled={busy} type="submit">
            {busy ? "Computing…" : "Upload and compute"}
          </button>
        </form>
      )}
      {status === "online" && !selected && (
        <p className="raster-note">
          No computed observations available. Run the explicitly synthetic
          fixture or upload real bands on Forest monitoring. The existing
          regional cards below remain demo data.
        </p>
      )}
      {selected && (
        <>
          <div className="raster-provenance">
            <strong>
              {selected.is_demo
                ? "SYNTHETIC FIXTURE — NOT SATELLITE OBSERVATIONS"
                : "USER-PROVIDED SENTINEL-2 — PROVENANCE NOT VERIFIED"}
            </strong>
            <p>
              {selected.metadata.area_name} · {selected.metadata.before_date} →{" "}
              {selected.metadata.after_date}. Independent scene footprint; the
              regional demo/date filters do not modify this comparison.
            </p>
          </div>
          <div className="raster-metrics">
            {[
              [
                "Common valid area",
                `${selected.statistics.valid_area_ha.toFixed(2)} ha`,
              ],
              [
                "Loss candidate area",
                `${selected.statistics.loss_area_ha.toFixed(2)} ha`,
              ],
              [
                "NDVI before → after",
                `${selected.statistics.mean_before_ndvi.toFixed(3)} → ${selected.statistics.mean_after_ndvi.toFixed(3)}`,
              ],
              [
                "Mean NDVI change",
                selected.statistics.mean_ndvi_change.toFixed(3),
              ],
              [
                "Heuristic risk / 100",
                selected.risk.score === null
                  ? "Incomplete"
                  : selected.risk.score.toFixed(2),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <details className="risk-explanation" open={expanded}>
            <summary>Explain the risk score and data limitations</summary>
            <p>
              {selected.risk.weights_source}. {selected.risk.interpretation}.
            </p>
            <p>
              Loss area is the fraction of baseline NDVI forest pixels lost
              (saturates at 10%). Mean positive NDVI decline over baseline
              forest pixels saturates at 0.30. Road influence falls linearly to
              zero at 1,000 m. Historical disturbance is a supplied fraction.
              These scales are engineering assumptions.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Weight</th>
                    <th>Normalized input</th>
                    <th>Score contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(selected.risk.components).map(([name, c]) => (
                    <tr key={name}>
                      <td>{name.replaceAll("_", " ")}</td>
                      <td>{Math.round(c.weight * 100)}%</td>
                      <td>
                        {c.normalized === null
                          ? "Not supplied"
                          : c.normalized.toFixed(3)}
                      </td>
                      <td>
                        {c.contribution === null
                          ? "Unavailable"
                          : c.contribution.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selected.risk.missing_inputs.length > 0 && (
              <p>
                Missing: {selected.risk.missing_inputs.join(", ")}. No total
                score is fabricated.
              </p>
            )}
            <p>Context provenance: {selected.metadata.context_provenance}</p>
            <p>
              {selected.statistics.valid_pixels} common valid pixels;{" "}
              {selected.statistics.excluded_pixels} excluded.
            </p>
            <ul>
              {selected.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </details>
          {expanded && (
            <>
              <div className="raster-comparison">
                <div className="raster-comparison-images">
                  <img
                    alt="After NDVI pseudocolor"
                    src={artifactUrl(selected.artifacts.after)}
                  />
                  <div style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
                    <img
                      alt="Before NDVI pseudocolor"
                      src={artifactUrl(selected.artifacts.before)}
                    />
                  </div>
                  <span className="image-label before-label">BEFORE NDVI</span>
                  <span className="image-label after-label">AFTER NDVI</span>
                </div>
                <label>
                  Before / after NDVI
                  <input
                    aria-label="Computed NDVI comparison"
                    type="range"
                    min="0"
                    max="100"
                    value={position}
                    onChange={(e) => setPosition(Number(e.target.value))}
                  />
                </label>
                <p>
                  NDVI pseudocolor: brown/low → green/high (−1 to +1);
                  transparent pixels are excluded. This is not RGB satellite
                  photography.
                </p>
              </div>
              <div className="raster-products">
                {(["loss", "change"] as const).map((kind) => (
                  <figure key={kind}>
                    <img
                      alt={
                        kind === "loss"
                          ? "Computed canopy-loss candidate mask"
                          : "Computed NDVI change raster"
                      }
                      src={artifactUrl(selected.artifacts[kind])}
                    />
                    <figcaption>
                      {kind === "loss"
                        ? "Loss mask: orange = candidate; dark green = other valid pixels"
                        : "NDVI change: red = decline; green = increase (saturates at ±0.5)"}
                      <a
                        href={artifactUrl(
                          selected.artifacts[kind].replace(".png", ".tif"),
                        )}
                        download={`${kind}.tif`}
                        className="text-button"
                      >
                        <Download size={13} /> Download georeferenced GeoTIFF
                      </a>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
