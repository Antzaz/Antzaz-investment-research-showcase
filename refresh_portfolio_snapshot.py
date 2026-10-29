from __future__ import annotations

"""Merge the daily public market refresh into the primary recruiter-safe snapshot.

The public repository already contains the intentionally published company names, weights and
recruiter-safe thesis text. This script updates every market-derived field from the fresh public
analytics/quote outputs while preserving those authored inputs. It never requires or serializes
private shares, cost basis, transactions, exact market value, credentials or ticker symbols.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
SNAPSHOT_PATH = DATA / "portfolio_snapshot.json"
ANALYTICS_PATH = DATA / "public_analytics.json"
FUNDAMENTALS_PATH = DATA / "public_fundamentals.json"
QUOTES_PATH = DATA / "stock_quotes.json"
SHORT_TERM_PATH = DATA / "short_term_performance.json"

MARKET_HOLDING_FIELDS = {
    "sector",
    "industry",
    "country",
    "currency",
    "weight",
    "risk_contribution",
    "forward_pe",
    "revenue_growth",
    "operating_margin",
    "roe",
}

FORBIDDEN_KEYS = {
    "ticker",
    "symbol",
    "shares",
    "share_count",
    "sharecount",
    "average_cost",
    "averagecost",
    "cost_basis",
    "costbasis",
    "market_value",
    "marketvalue",
    "unrealized_pnl",
    "unrealizedpnl",
    "transactions",
    "private_notes",
    "privatenotes",
}


def _load(path: Path) -> dict:
    if not path.exists() or path.stat().st_size == 0:
        raise RuntimeError(f"Required public refresh input is missing: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise RuntimeError(f"Expected JSON object in {path}")
    return data


def _normalized_key(value: str) -> str:
    return str(value or "").replace("_", "").replace(" ", "").lower()


def _walk_keys(value):
    if isinstance(value, dict):
        for key, child in value.items():
            yield str(key)
            yield from _walk_keys(child)
    elif isinstance(value, list):
        for child in value:
            yield from _walk_keys(child)


def _merge_holdings(base_rows: list[dict], live_rows: list[dict], quote_rows: list[dict]) -> list[dict]:
    base = {str(x.get("company") or ""): dict(x) for x in base_rows if x.get("company")}
    quotes = {str(x.get("company") or ""): x for x in quote_rows if x.get("company")}
    out = []
    for live in live_rows:
        company = str(live.get("company") or "").strip()
        if not company:
            continue
        row = dict(base.get(company, {}))
        row["company"] = company
        for field in MARKET_HOLDING_FIELDS:
            if live.get(field) is not None:
                row[field] = live.get(field)

        q = quotes.get(company) or {}
        if q.get("status") == "ok":
            row["current_price"] = q.get("current_price")
            row["price_as_of"] = q.get("as_of")
            row["price_changes"] = q.get("changes") or {}

        for key in list(row):
            if _normalized_key(key) in {_normalized_key(x) for x in FORBIDDEN_KEYS}:
                row.pop(key, None)
        out.append(row)
    out.sort(key=lambda x: float(x.get("weight") or 0.0), reverse=True)
    return out


def _refresh_theses(theses: list[dict], holdings: list[dict]) -> list[dict]:
    lookup = {str(x.get("company") or ""): x for x in holdings}
    refreshed = []
    for thesis in theses:
        row = dict(thesis)
        live = lookup.get(str(row.get("company") or "")) or {}
        for field in MARKET_HOLDING_FIELDS | {"current_price", "price_as_of", "price_changes"}:
            if live.get(field) is not None:
                row[field] = live.get(field)
        refreshed.append(row)
    return refreshed


def main() -> None:
    base = _load(SNAPSHOT_PATH)
    analytics = _load(ANALYTICS_PATH)
    fundamentals = _load(FUNDAMENTALS_PATH)
    quotes = _load(QUOTES_PATH)
    short_term = _load(SHORT_TERM_PATH)

    if not analytics.get("generated_utc"):
        raise RuntimeError("Public analytics has no generated_utc.")
    if not analytics.get("holdings"):
        raise RuntimeError("Public analytics contains no holdings.")

    prior_meta = base.get("metadata") or {}
    already_overlay = prior_meta.get("public_refresh_layer") == "daily_market_overlay"
    private_input_generated = (
        prior_meta.get("private_input_generated_utc")
        if already_overlay
        else base.get("generated_utc")
    )

    snapshot = dict(base)
    snapshot["generated_utc"] = analytics["generated_utc"]
    snapshot["data_note"] = (
        "Portfolio market analytics are refreshed daily from public market data using the "
        "already-published company names and portfolio weights. Recruiter-safe thesis text and "
        "portfolio inputs remain preserved until the next private sanitized-input sync."
    )

    merged_holdings = _merge_holdings(
        base.get("holdings") or [],
        analytics.get("holdings") or [],
        quotes.get("stocks") or [],
    )

    snapshot["metadata"] = {
        **prior_meta,
        **(analytics.get("metadata") or {}),
        "public_refresh_layer": "daily_market_overlay",
        "private_input_generated_utc": private_input_generated,
        "public_analytics_generated_utc": analytics.get("generated_utc"),
        "public_fundamentals_generated_utc": fundamentals.get("generated_utc"),
        "stock_quotes_generated_utc": quotes.get("generated_utc"),
        "stock_market_as_of": quotes.get("market_as_of"),
        "short_term_performance_generated_utc": short_term.get("generated_utc"),
    }

    snapshot["metrics"] = analytics.get("metrics") or snapshot.get("metrics") or {}
    snapshot["portfolio_characteristics"] = (
        analytics.get("portfolio_characteristics")
        or snapshot.get("portfolio_characteristics")
        or {}
    )
    snapshot["holdings"] = merged_holdings
    snapshot["theses"] = _refresh_theses(snapshot.get("theses") or [], merged_holdings)

    for key in (
        "attribution",
        "alpha",
        "factors",
        "stress",
        "historical_stress",
        "rolling_risk",
        "reverse_dcf",
        "timeseries",
    ):
        value = analytics.get(key)
        if isinstance(value, list) and value:
            snapshot[key] = value

    # Keep the compact short-term table inside the canonical snapshot as well as its standalone
    # JSON so every market-derived public layer shares one freshness timestamp.
    snapshot["short_term_performance"] = {
        "generated_utc": short_term.get("generated_utc"),
        "as_of": short_term.get("as_of"),
        "previous_trading_date": short_term.get("previous_trading_date"),
        "benchmark": short_term.get("benchmark"),
        "periods": short_term.get("periods") or [],
        "coverage": short_term.get("coverage") or {},
    }

    forbidden = sorted({
        key for key in _walk_keys(snapshot)
        if _normalized_key(key) in {_normalized_key(x) for x in FORBIDDEN_KEYS}
    })
    if forbidden:
        raise RuntimeError(
            "Refusing to publish sensitive/private field names: " + ", ".join(forbidden)
        )

    if len(snapshot["holdings"]) != len(analytics.get("holdings") or []):
        raise RuntimeError("Canonical snapshot holding count does not match public analytics.")

    SNAPSHOT_PATH.write_text(
        json.dumps(snapshot, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(
        "Canonical public snapshot refreshed:",
        len(snapshot["holdings"]),
        "holdings; generated_utc=",
        snapshot["generated_utc"],
    )


if __name__ == "__main__":
    main()
