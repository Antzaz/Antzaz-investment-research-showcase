from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from refresh_public_analytics import (
    BENCHMARK,
    OVERRIDES_PATH,
    SNAPSHOT_PATH,
    SYMBOLS,
    apply_overrides,
    download_prices,
)

ROOT = Path(__file__).resolve().parent
OUTPUT_PATH = ROOT / "data" / "short_term_performance.json"
TRADING_PERIODS = {
    "1D": 1,
    "1W": 5,
    "1M": 21,
    "3M": 63,
    "6M": 126,
    "1Y": 252,
}


def _num(value):
    try:
        x = float(value)
        return x if math.isfinite(x) else None
    except Exception:
        return None


def _compound(returns: pd.Series) -> float | None:
    values = pd.to_numeric(returns, errors="coerce").dropna()
    if values.empty:
        return None
    return float((1.0 + values).prod() - 1.0)


def _period_row(label: str, portfolio: pd.Series, benchmark: pd.Series) -> dict:
    sessions = TRADING_PERIODS[label]
    p = _compound(portfolio.tail(sessions))
    b = _compound(benchmark.tail(sessions))
    return {
        "period": label,
        "sessions": sessions,
        "portfolio_return": p,
        "benchmark_return": b,
        "excess_return": (p - b) if p is not None and b is not None else None,
    }


def _calendar_period_row(label: str, portfolio: pd.Series, benchmark: pd.Series) -> dict:
    if portfolio.empty:
        return {
            "period": label,
            "sessions": 0,
            "portfolio_return": None,
            "benchmark_return": None,
            "excess_return": None,
        }
    latest = portfolio.index[-1]
    if label == "MTD":
        mask = (portfolio.index.year == latest.year) & (portfolio.index.month == latest.month)
    elif label == "QTD":
        quarter = (latest.month - 1) // 3 + 1
        mask = (portfolio.index.year == latest.year) & (((portfolio.index.month - 1) // 3 + 1) == quarter)
    elif label == "YTD":
        mask = portfolio.index.year == latest.year
    else:
        raise ValueError(label)
    pr = portfolio.loc[mask]
    br = benchmark.reindex(pr.index)
    p = _compound(pr)
    b = _compound(br)
    return {
        "period": label,
        "sessions": int(pr.notna().sum()),
        "portfolio_return": p,
        "benchmark_return": b,
        "excess_return": (p - b) if p is not None and b is not None else None,
    }


def build_short_term_performance() -> dict:
    snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
    overrides = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    holdings, _ = apply_overrides(snapshot, overrides)

    missing_symbols = [h["company"] for h in holdings if h.get("company") not in SYMBOLS]
    if missing_symbols:
        raise SystemExit(f"Missing public symbol mapping for: {', '.join(missing_symbols)}")

    symbols = [SYMBOLS[h["company"]] for h in holdings]
    prices = download_prices(list(dict.fromkeys(symbols + [BENCHMARK])))

    missing_prices = [s for s in symbols + [BENCHMARK] if s not in prices.columns]
    if missing_prices:
        raise SystemExit(f"Missing price history for: {', '.join(missing_prices)}")

    weights = pd.Series(
        {SYMBOLS[h["company"]]: float(h.get("weight") or 0.0) for h in holdings},
        dtype=float,
    )
    if weights.sum() <= 0:
        raise SystemExit("Published portfolio weights are unavailable.")
    weights = weights / weights.sum()

    # Use the benchmark trading calendar, but preserve foreign-market closes that occur
    # on non-US dates by first forward-filling on the union of all downloaded dates.
    # Forward-fill uses only prices already observed; there is no backward-fill/look-ahead.
    benchmark_price = pd.to_numeric(prices[BENCHMARK], errors="coerce").dropna()
    benchmark_calendar = benchmark_price.index
    union_index = prices.index.union(benchmark_calendar).sort_values()

    aligned_assets = (
        prices[symbols]
        .reindex(union_index)
        .sort_index()
        .ffill(limit=10)
        .reindex(benchmark_calendar)
    )
    aligned_assets = aligned_assets.loc[:, ~aligned_assets.columns.duplicated()]

    valid = aligned_assets.notna().all(axis=1) & benchmark_price.reindex(aligned_assets.index).notna()
    aligned_assets = aligned_assets.loc[valid]
    aligned_benchmark = benchmark_price.reindex(aligned_assets.index)

    if len(aligned_assets) < 253:
        raise SystemExit(f"Insufficient aligned daily history: {len(aligned_assets)} observations")

    asset_returns = aligned_assets.pct_change(fill_method=None)
    benchmark_returns = aligned_benchmark.pct_change(fill_method=None)
    daily = asset_returns.mul(weights.reindex(asset_returns.columns).fillna(0.0), axis=1).sum(axis=1)

    valid_returns = asset_returns.notna().all(axis=1) & benchmark_returns.notna()
    daily = daily.loc[valid_returns]
    benchmark_returns = benchmark_returns.loc[valid_returns]

    if daily.empty:
        raise SystemExit("No aligned daily portfolio returns were produced.")

    rows = [_period_row(label, daily, benchmark_returns) for label in TRADING_PERIODS]
    rows.extend(_calendar_period_row(label, daily, benchmark_returns) for label in ("MTD", "QTD", "YTD"))

    as_of = pd.Timestamp(daily.index[-1]).date().isoformat()
    previous = pd.Timestamp(daily.index[-2]).date().isoformat() if len(daily) > 1 else None
    return {
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "as_of": as_of,
        "previous_trading_date": previous,
        "benchmark": "S&P 500",
        "benchmark_proxy": BENCHMARK,
        "methodology": (
            "Current published portfolio weights applied to adjusted close returns. "
            "Foreign/local-market prices are aligned to S&P 500 trading dates by carrying forward only already-observed closes; "
            "no backward-fill or future price is used. 1W/1M/3M/6M/1Y use 5/21/63/126/252 benchmark trading sessions."
        ),
        "privacy_note": (
            "This file contains aggregate portfolio and benchmark percentage returns only. "
            "It excludes shares, cost basis, market value, transactions, private notes and credentials."
        ),
        "periods": rows,
        "coverage": {
            "aligned_daily_observations": int(len(daily)),
            "portfolio_components": int(len(weights)),
            "analysis_start": pd.Timestamp(daily.index[0]).date().isoformat(),
            "analysis_end": as_of,
        },
    }


def main() -> None:
    payload = build_short_term_performance()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(
        "Short-term public performance:",
        json.dumps(
            {
                "as_of": payload["as_of"],
                "aligned_daily_observations": payload["coverage"]["aligned_daily_observations"],
                "periods": len(payload["periods"]),
            },
            indent=2,
        ),
    )


if __name__ == "__main__":
    main()
