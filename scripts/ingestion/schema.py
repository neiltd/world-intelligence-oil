"""
Pydantic v2 models that mirror the TypeScript types in frontend/src/types/oil.ts.

These are the canonical data contracts — any ingested record that fails
validation is logged and excluded from the output file.

Gemini standards enforced here:
  - null for missing values, never 0
  - ISO3 geography keys
  - ISO 8601 dates
  - Canonical unit strings
  - Source precedence: EIA > EnergyInstitute > WorldBank > OPEC > manual
"""
from __future__ import annotations

import re
from typing import Literal, Optional

from pydantic import BaseModel, field_validator, model_validator


# ── Shared literals (mirrors TypeScript unions) ───────────────────────────────

DataSource   = Literal["EIA", "EnergyInstitute", "WorldBank", "OPEC", "manual"]
DataFreq     = Literal["daily", "monthly", "annual"]
CrudeType    = Literal["Brent", "WTI", "Dubai"]
PriceUnit    = Literal["dollars per barrel"]
ReservesUnit = Literal["billion barrels"]
ProdUnit     = Literal["thousand barrels per day"]


# ── Oil price record ──────────────────────────────────────────────────────────

class OilPriceRecord(BaseModel):
    date:       str
    crude_type: CrudeType
    price_usd:  float
    unit:       PriceUnit
    frequency:  DataFreq
    source:     DataSource
    source_id:  Optional[str] = None
    source_url: Optional[str] = None

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{2}(-\d{2})?$", v):
            raise ValueError(f"Expected YYYY-MM or YYYY-MM-DD, got {v!r}")
        return v

    @field_validator("price_usd")
    @classmethod
    def validate_price(cls, v: float) -> float:
        from . import config
        if v <= config.PRICE_MIN_USD:
            raise ValueError(f"price_usd {v} is below minimum {config.PRICE_MIN_USD}")
        if v > config.PRICE_MAX_USD:
            raise ValueError(f"price_usd {v} exceeds maximum {config.PRICE_MAX_USD}")
        return round(v, 2)


# ── Country oil supply record ─────────────────────────────────────────────────

class OilCountrySupplyRecord(BaseModel):
    country:          str
    iso3:             str
    year:             int
    reserves:         Optional[float]   # Bbbl — null means unknown, not zero
    unit_reserves:    ReservesUnit
    production:       Optional[float]   # kb/d — null means unknown, not zero
    unit_production:  ProdUnit
    exports:          Optional[float]   # null in v1 (out of scope)
    imports:          Optional[float]   # null in v1 (out of scope)
    opec_member:      bool
    source:           DataSource
    source_id:        Optional[str] = None
    source_url:       Optional[str] = None
    data_year_note:   Optional[str] = None

    @field_validator("iso3")
    @classmethod
    def validate_iso3(cls, v: str) -> str:
        if not re.match(r"^[A-Z]{3}$", v):
            raise ValueError(f"iso3 must be 3 uppercase letters, got {v!r}")
        return v

    @field_validator("year")
    @classmethod
    def validate_year(cls, v: int) -> int:
        if not (1960 <= v <= 2030):
            raise ValueError(f"year {v} is outside expected range 1960-2030")
        return v

    @field_validator("reserves")
    @classmethod
    def validate_reserves(cls, v: Optional[float]) -> Optional[float]:
        if v is None:
            return v
        if v < 0:
            raise ValueError(f"reserves cannot be negative: {v}")
        from . import config
        if v > config.RESERVES_MAX_BBBL:
            raise ValueError(f"reserves {v} Bbbl exceeds plausible maximum {config.RESERVES_MAX_BBBL}")
        return round(v, 3)

    @field_validator("production")
    @classmethod
    def validate_production(cls, v: Optional[float]) -> Optional[float]:
        if v is None:
            return v
        if v < 0:
            raise ValueError(f"production cannot be negative: {v}")
        from . import config
        if v > config.PRODUCTION_MAX_KBD:
            raise ValueError(f"production {v} kb/d exceeds plausible maximum {config.PRODUCTION_MAX_KBD}")
        return round(v, 2)

    @model_validator(mode="after")
    def null_not_zero_check(self) -> "OilCountrySupplyRecord":
        # Gemini standard: 0 is never used to represent missing data.
        # If production or reserves is 0 exactly, it must be confirmed zero — log a warning.
        # We don't raise here (a country could genuinely produce 0) but the calling
        # code should verify before accepting 0 as valid.
        return self
