import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Requires both services. Creates one explicitly synthetic, persisted comparison.
const base = process.argv[2] ?? "http://127.0.0.1:3000";
async function request(path, init) {
  return fetch(new URL(`/api/backend${path}`, base), {
    ...init,
    signal: AbortSignal.timeout(60_000),
  });
}
const health = await request("/health");
assert.equal(health.status, 200, "start the FastAPI backend before this check");
assert.equal((await health.json()).status, "ok");
const metadata = JSON.parse(
  await readFile(
    new URL("../backend/fixtures/metadata.json", import.meta.url),
    "utf8",
  ),
);
const payload = new FormData();
payload.append("metadata", JSON.stringify(metadata));
for (const name of ["before_red", "before_nir", "after_red", "after_nir"]) {
  const bytes = await readFile(
    new URL(`../backend/fixtures/${name}.tif`, import.meta.url),
  );
  payload.append(
    name,
    new Blob([bytes], { type: "image/tiff" }),
    `${name}.tif`,
  );
}
const response = await request("/analyses", { method: "POST", body: payload });
assert.equal(response.status, 201, "expected computed analysis");
const record = await response.json();
const recordsResponse = await request("/analyses");
assert.equal(recordsResponse.status, 200);
assert.ok((await recordsResponse.json()).some((r) => r.id === record.id));
assert.ok(record, "synthetic upload persisted");
assert.equal(record.statistics.loss_pixels, 16);
assert.equal(record.statistics.loss_area_ha, 0.16);
assert.ok(Math.abs(record.statistics.mean_ndvi_change + 0.034375) < 1e-6);
assert.equal(record.risk.score, 43.31);
for (const path of ["/detections", "/monitoring-areas", "/risk-scores"]) {
  const collection = await request(path);
  assert.equal(collection.status, 200);
  assert.ok(
    (await collection.json()).some((r) => r.id === record.id),
    path,
  );
}
for (const kind of ["before", "after", "loss", "change"]) {
  const image = await request(record.artifacts[kind]);
  assert.equal(image.status, 200);
  assert.match(image.headers.get("content-type"), /image\/png/);
  const bytes = new Uint8Array(await image.arrayBuffer());
  assert.deepEqual(
    Array.from(bytes.slice(0, 8)),
    [137, 80, 78, 71, 13, 10, 26, 10],
  );
}
const geotiff = await request(record.artifacts.loss.replace(".png", ".tif"));
assert.equal(geotiff.status, 200);
assert.match(geotiff.headers.get("content-type"), /image\/tiff/);
console.log(
  "PASS frontend proxy → multipart raster upload → numerical loss/risk → all collections and artifacts (synthetic fixture only)",
);
