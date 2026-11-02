from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class AnalysisMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    area_name: str = Field(min_length=1, max_length=120)
    source: Literal["sentinel2", "synthetic_fixture"]
    before_date: date
    after_date: date
    # Supply the product's actual calibration. Sentinel processing baselines differ.
    before_scale: float = Field(gt=0, le=1)
    before_offset: float = Field(ge=-2, le=2)
    after_scale: float = Field(gt=0, le=1)
    after_offset: float = Field(ge=-2, le=2)
    forest_threshold: float = Field(default=0.6, ge=0, le=1)
    decline_threshold: float = Field(default=0.2, gt=0, le=2)
    road_distance_m: float | None = Field(default=None, ge=0)
    historical_disturbance_fraction: float | None = Field(default=None, ge=0, le=1)
    context_provenance: str = Field(default="Not supplied", max_length=500)

    @model_validator(mode="after")
    def dates_in_order(self):
        if self.after_date <= self.before_date:
            raise ValueError("after_date must follow before_date")
        return self
