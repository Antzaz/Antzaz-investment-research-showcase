from __future__ import annotations
"""Public market-only quotes: never export private purchase prices or transactions."""
import json
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd
from refresh_public_analytics import SNAPSHOT_PATH, OVERRIDES_PATH, SYMBOLS, apply_overrides, download_prices

OUT = Path(__file__).resolve().parent / "data" / "stock_quotes.json"
WINDOWS = {"1D": 1, "1W": 5, "1M": 21, "3M": 63, "6M": 126, "1Y": 252}

def build():
    snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
    overrides = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    holdings, aliases = apply_overrides(snapshot, overrides)
    missing = [h["company"] for h in holdings if h["company"] not in SYMBOLS]
    if missing:
        raise ValueError("Missing symbol mappings: " + ", ".join(missing))
    prices = download_prices(list(dict.fromkeys(SYMBOLS[h["company"]] for h in holdings)))
    rows = []
    for h in holdings:
        symbol = SYMBOLS[h["company"]]
        if symbol not in prices:
            rows.append({"company": h["company"], "symbol": symbol, "status": "unavailable"})
            continue
        series = pd.to_numeric(prices[symbol], errors="coerce").dropna()
        if series.empty:
            rows.append({"company": h["company"], "symbol": symbol, "status": "unavailable"})
            continue
        changes = {}
        for label, sessions in WINDOWS.items():
            changes[label] = float(series.iloc[-1] / series.iloc[-1-sessions] - 1) if len(series) > sessions else None
        rows.append({"company": h["company"], "symbol": symbol, "currency": h.get("currency"),
                     "as_of": series.index[-1].date().isoformat(), "current_price": float(series.iloc[-1]),
                     "changes": changes, "status": "ok"})
    return {"generated_utc": datetime.now(timezone.utc).isoformat(), "source": "Yahoo Finance adjusted daily closes",
            "note": "Prices may be delayed. Public data excludes private cost basis, shares, and transactions.",
            "stocks": rows}

if __name__ == "__main__":
    OUT.parent.mkdir(exist_ok=True, parents=True)
    result = build()
    OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print("Published market quotes for", len(result["stocks"]), "holdings")
