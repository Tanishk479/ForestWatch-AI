export type Risk = {
  score: number | null;
  components: Record<
    string,
    { weight: number; normalized: number | null; contribution: number | null }
  >;
  missing_inputs: string[];
  weights_source: string;
  interpretation: string;
};
export type Analysis = {
  id: string;
  is_demo: boolean;
  provenance: string;
  metadata: {
    area_name: string;
    before_date: string;
    after_date: string;
    context_provenance: string;
  };
  statistics: {
    valid_pixels: number;
    excluded_pixels: number;
    loss_pixels: number;
    valid_area_ha: number;
    baseline_forest_area_ha: number;
    loss_area_ha: number;
    mean_before_ndvi: number;
    mean_after_ndvi: number;
    mean_ndvi_change: number;
  };
  risk: Risk;
  warnings: string[];
  artifacts: Record<"before" | "after" | "change" | "loss", string>;
  bounds_wgs84: number[];
};
export const artifactUrl = (path: string) => `/api/backend${path}`;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      typeof error.detail === "string"
        ? error.detail
        : `Backend request failed (${response.status})`,
      response.status,
    );
  }
  return response.json();
}
