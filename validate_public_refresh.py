from __future__ import annotations

"""Fail the public workflow when a supposedly complete refresh is stale or incomplete."""

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"

FILES = {
    "snapshot": DATA / "portfolio_snapshot.json",
    "analytics": DATA / "public_analytics.json",
    "fundamentals": DATA / "public_fundamentals.json",
    "short_term": DATA / "short_term_performance.json",
    "quotes": DATA / "stock_quotes.json",
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
        raise RuntimeError(f"Missing refresh output: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise RuntimeError(f"Invalid JSON object: {path}")
    return data


def _dt(value: str) -> datetime:
    if not value:
        raise RuntimeError("Missing generated_utc.")
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _norm(value: str) -> str:
    return str(value or "").replace("_", "").replace(" ", "").lower()


def _walk_keys(value):
    if isinstance(value, dict):
        for key, child in value.items():
            yield str(key)
            yield from _walk_keys(child)
    elif isinstance(value, list):
        for child in value:
            yield from _walk_keys(child)


def main() -> None:
    now = datetime.now(timezone.utc)
    payloads = {name: _load(path) for name, path in FILES.items()}

    # Every generated market-data file must have been rebuilt by this workflow.
    for name, payload in payloads.items():
        age_hours = (now - _dt(payload.get("generated_utc"))).total_seconds() / 3600
        if age_hours < -0.5 or age_hours > 4:
            raise RuntimeError(f"{name} refresh timestamp is stale or invalid: {age_hours:.2f} hours old")

    snapshot = payloads["snapshot"]
    analytics = payloads["analytics"]
    quotes = payloads["quotes"]
    fundamentals = payloads["fundamentals"]
    short_term = payloads["short_term"]

    holdings = snapshot.get("holdings") or []
    live_holdings = analytics.get("holdings") or []
    stocks = quotes.get("stocks") or []

    if not holdings or len(holdings) != len(live_holdings) or len(stocks) != len(holdings):
        raise RuntimeError(
            f"Holding coverage mismatch: snapshot={len(holdings)}, "
            f"analytics={len(live_holdings)}, quotes={len(stocks)}"
        )

    if any(row.get("status") != "ok" for row in stocks):
        bad = [row.get("company") for row in stocks if row.get("status") != "ok"]
        raise RuntimeError("Incomplete quote coverage: " + ", ".join(str(x) for x in bad))

    required_arrays = {
        "analytics.timeseries": analytics.get("timeseries"),
        "analytics.attribution": analytics.get("attribution"),
        "analytics.factors": analytics.get("factors"),
        "analytics.alpha": analytics.get("alpha"),
        "analytics.stress": analytics.get("stress"),
        "analytics.reverse_dcf": analytics.get("reverse_dcf"),
        "short_term.periods": short_term.get("periods"),
        "fundamentals.companies": fundamentals.get("companies"),
    }
    empty = [name for name, value in required_arrays.items() if not isinstance(value, list) or not value]
    if empty:
        raise RuntimeError("Required refreshed datasets are empty: " + ", ".join(empty))

    market_as_of = quotes.get("market_as_of")
    if not market_as_of:
        raise RuntimeError("Quote payload is missing market_as_of.")
    market_date = datetime.fromisoformat(market_as_of).date()
    age_days = (now.date() - market_date).days
    # Weekends, public holidays and cross-market calendars can legitimately leave the latest
    # observed close several calendar days old, but a week-old market date is not acceptable.
    if age_days < 0 or age_days > 7:
        raise RuntimeError(f"Latest observed market close is too old: {market_as_of}")

    forbidden = sorted({
        key for payload in (snapshot, quotes)
        for key in _walk_keys(payload)
        if _norm(key) in {_norm(x) for x in FORBIDDEN_KEYS}
    })
    if forbidden:
        raise RuntimeError("Sensitive/public-policy fields detected: " + ", ".join(forbidden))

    meta = snapshot.get("metadata") or {}
    if meta.get("public_refresh_layer") != "daily_market_overlay":
        raise RuntimeError("Canonical snapshot was not rebuilt by the daily market overlay.")
    if snapshot.get("generated_utc") != analytics.get("generated_utc"):
        raise RuntimeError("Canonical snapshot and public analytics freshness timestamps differ.")

    print("Public refresh validation passed.")
    print(f"Holdings/quotes: {len(holdings)} / {len(stocks)}")
    print(f"Latest observed market close: {market_as_of}")
    print(f"Alpha models: {len(analytics.get('alpha') or [])}")
    print(f"Stress scenarios: {len(analytics.get('stress') or [])}")


if __name__ == "__main__":
    main()
