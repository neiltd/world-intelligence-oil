"""
Central configuration — env loading, paths, and shared constants.
All other modules import from here; nothing reads os.environ directly.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# ── Environment ───────────────────────────────────────────────────────────────

_ENV_FILE = Path(__file__).parent.parent.parent / ".env"  # repo root .env
load_dotenv(_ENV_FILE, override=False)  # override=False: shell vars win

EIA_API_KEY: str = os.getenv("EIA_API_KEY", "")
EIA_BASE_URL: str = "https://api.eia.gov/v2"

START_YEAR: int = int(os.getenv("START_YEAR", "2010"))
END_YEAR:   int = int(os.getenv("END_YEAR",   "2024"))

# ── Paths ─────────────────────────────────────────────────────────────────────

REPO_ROOT: Path = Path(__file__).parent.parent.parent

# Live data lands here — imported by frontend when the user is ready to switch
# from _sample files.  Committed to git so the Vite build is reproducible.
OUT_DIR: Path = REPO_ROOT / "frontend" / "src" / "data" / "oil" / "live"

# ── EIA series identifiers (petroleum spot prices) ────────────────────────────
# Documented: https://api.eia.gov/v2/petroleum/pri/spt/data/
# Series can be confirmed by querying /petroleum/pri/spt/facet/series/

EIA_PRICE_SERIES: dict[str, str] = {
    "Brent": "RBRTE",   # Europe Brent Spot Price FOB (dollars per barrel)
    "WTI":   "RWTC",    # West Texas Intermediate - Cushing (dollars per barrel)
}

# ── EIA international data facet IDs ─────────────────────────────────────────
# Documented: https://api.eia.gov/v2/international/data/
# activityId and productId can be browsed at:
#   https://api.eia.gov/v2/international/data/facet/activityId/
#   https://api.eia.gov/v2/international/data/facet/productId/

EIA_ACTIVITY_PRODUCTION: str = "1"   # Petroleum production (confirmed via API discovery)
EIA_ACTIVITY_RESERVES:   str = "3"   # Note: international proved reserves are NOT available
                                      # via /international/data/ — petroleum/crd/pres is US-only.
                                      # Reserves data requires an alternative source (OWID/EI CSV).
EIA_PRODUCT_TOTAL_LIQUIDS: str = "53" # Total petroleum and other liquids — EIA's standard
                                       # international production metric (crude + NGL + other).
                                       # This is what IEA/OPEC also report as country "production".
# Keep the old name as an alias so existing references don't break during migration
EIA_PRODUCT_CRUDE: str = EIA_PRODUCT_TOTAL_LIQUIDS

# ── Source URLs (used in exported records for audit trail) ────────────────────

EIA_PRICE_SOURCE_URL:  str = "https://api.eia.gov/v2/petroleum/pri/spt/data/"
EIA_SUPPLY_SOURCE_URL: str = "https://api.eia.gov/v2/international/data/"

# ── Validation guards ─────────────────────────────────────────────────────────

PRICE_MIN_USD: float = 1.0    # Barrel price below this is suspicious
PRICE_MAX_USD: float = 500.0  # Barrel price above this is suspicious

RESERVES_MAX_BBBL: float = 400.0   # Venezuela holds ~304 Bbbl — upper bound
PRODUCTION_MAX_KBD: float = 30_000.0  # US total petroleum liquids ~22 mb/d in 2024;
                                       # 30,000 gives headroom for future growth.
