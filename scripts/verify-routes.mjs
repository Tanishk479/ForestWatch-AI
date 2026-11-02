import assert from "node:assert/strict";

// Run against an already-started production server. No browser or API key needed.
const base = process.argv[2] ?? "http://127.0.0.1:3000";
const routes = new Map([
  ["/", "Eyes on the forest."],
  ["/monitoring", "See change. Take action."],
  ["/map", "A clearer view from above."],
  ["/devices", "Connected to the wild."],
]);
let failures = 0;
for (const [route, heading] of routes) {
  try {
    const response = await fetch(new URL(route, base), {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    assert.equal(response.status, 200, "expected HTTP 200");
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    const html = await response.text();
    assert.ok(html.includes(heading), "expected route-specific heading");
    assert.ok(
      html.includes("Sample data environment"),
      "missing sample-data label",
    );
    assert.ok(html.includes("DEMO WORKSPACE"), "missing demo workspace label");
    assert.ok(
      !/<canvas(?:\s|>)/i.test(html),
      "3D canvas must mount client-side",
    );
    assert.ok(
      !/class="[^"]*leaflet-container/.test(html),
      "Leaflet must mount client-side",
    );
    assert.ok(
      !html.includes("window is not defined"),
      "browser globals used during SSR",
    );
    console.log(
      `PASS ${route}: HTTP 200, expected content, sample labels, SSR guards`,
    );
  } catch (error) {
    failures++;
    console.error(`FAIL ${route}: ${error.message}`);
  }
}
if (failures) process.exitCode = 1;
