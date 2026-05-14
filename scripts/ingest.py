"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  LOCAL FALLBACK ONLY — NOT PRIMARY PRODUCTION ARCHITECTURE                  ║
║                                                                              ║
║  These scripts are a development bootstrap for the world-intelligence-oil   ║
║  project. They call EIA and other external APIs directly, which is AGAINST  ║
║  the final ecosystem architecture.                                          ║
║                                                                              ║
║  Production data ingestion belongs exclusively in:                          ║
║    world-intelligence-data-hub                                               ║
║                                                                              ║
║  These scripts should be run only when:                                     ║
║    - the data hub is not yet connected to this project, OR                  ║
║    - developing/testing locally without the hub running                     ║
║                                                                              ║
║  When the hub is live, frontend/src/data/imports/adapter.ts automatically  ║
║  prioritizes hub data over the local live/ fallback this produces.          ║
╚══════════════════════════════════════════════════════════════════════════════╝

Oil Intelligence — local fallback ingestion CLI.

Usage (run from the repository root):
    python scripts/ingest.py prices    # EIA Brent + WTI monthly prices
    python scripts/ingest.py supply    # EIA production by country
    python scripts/ingest.py reserves  # EI reserves from seed CSV
    python scripts/ingest.py all       # all three, in order

Prerequisites:
    cd scripts
    pip install -r requirements.txt
    cp .env.example .env
    # Add your EIA API key to .env

Output:
    frontend/src/data/oil/live/oil_price.json
    frontend/src/data/oil/live/oil_country_supply.json
"""
from __future__ import annotations

import sys
from pathlib import Path

# Make the scripts/ directory importable when run as a top-level script
sys.path.insert(0, str(Path(__file__).parent))

from rich.console import Console

console = Console()


def _check_env() -> bool:
    from ingestion import config
    if not config.EIA_API_KEY:
        console.print(
            "[red]✗ EIA_API_KEY is not set.[/]\n"
            "  Copy [bold]scripts/.env.example[/] → [bold]scripts/.env[/] "
            "and add your key.\n"
            "  Get a free key at [link]https://www.eia.gov/opendata/[/link]"
        )
        return False
    return True


def _cmd_prices() -> int:
    from ingestion.ingest_prices import run
    return run()


def _cmd_supply() -> int:
    from ingestion.ingest_supply import run
    return run()


def _cmd_reserves() -> int:
    source = "owid" if "--source" in sys.argv and "owid" in sys.argv else "seed"
    from ingestion.ingest_reserves_owid import run
    return run(source=source)


def _cmd_all() -> int:
    rc = _cmd_prices()
    if rc != 0:
        console.print("[yellow]⚠ Prices ingestion had errors — continuing…[/]")
    rc2 = _cmd_supply()
    if rc2 != 0:
        console.print("[yellow]⚠ Supply ingestion had errors — continuing to reserves…[/]")
    rc3 = _cmd_reserves()
    return max(rc, rc2, rc3)


COMMANDS = {
    "prices":   _cmd_prices,
    "supply":   _cmd_supply,
    "reserves": _cmd_reserves,
    "all":      _cmd_all,
}

HELP = """
[bold]Oil Intelligence — Ingestion CLI[/]

[bold cyan]Commands:[/]
  prices            Fetch EIA Brent + WTI monthly spot prices
  supply            Fetch EIA production by country (reserves=null until 'reserves' runs)
  reserves          Join EI proved reserves into supply (seed by default)
  reserves --source owid  Use OWID download instead (EIA methodology — see docs)
  all               Run prices → supply → reserves in order

[bold cyan]Examples:[/]
  python scripts/ingest.py prices
  python scripts/ingest.py reserves
  python scripts/ingest.py all

[bold cyan]Environment:[/]
  Copy scripts/.env.example → scripts/.env
  Set EIA_API_KEY (free at https://www.eia.gov/opendata/)
  Optionally set START_YEAR and END_YEAR

[bold cyan]Output:[/]
  frontend/src/data/oil/live/oil_price.json
  frontend/src/data/oil/live/oil_country_supply.json
"""


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        console.print(HELP)
        return 0

    cmd = sys.argv[1].lower()
    if cmd not in COMMANDS:
        console.print(f"[red]Unknown command: {cmd!r}[/]")
        console.print(f"Valid commands: {', '.join(COMMANDS)}")
        return 1

    if not _check_env():
        return 1

    return COMMANDS[cmd]()


if __name__ == "__main__":
    sys.exit(main())
