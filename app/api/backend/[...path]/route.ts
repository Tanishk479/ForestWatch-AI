import { NextRequest } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const base = (
    process.env.FORESTWATCH_API_URL ?? "http://127.0.0.1:8000"
  ).replace(/\/$/, "");
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  };
  if (request.method === "POST") {
    init.body = request.body;
    init.duplex = "half";
    init.headers = {
      "Content-Type": request.headers.get("content-type") ?? "application/json",
    };
  }
  try {
    const response = await fetch(
      `${base}/${path.map(encodeURIComponent).join("/")}`,
      init,
    );
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { detail: "Raster backend is unavailable. Demo fallback is active." },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST };
