from __future__ import annotations

import json
import math
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import yfinance as yf

ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "data" / "thesis_overrides.json"
DEST = ROOT / "data" / "public_fundamentals.json"

WACC = 0.09
TERMINAL_GROWTH = 0.03
YEARS = 10
MIN_GROWTH = -0.20
MAX_GROWTH = 0.50


def num(value):
    try:
        x = float(value)
        return x if math.isfinite(x) else None
    except Exception:
        return None


def norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(text).lower())


def resolve_symbol(company: str) -> str | None:
    try:
        quotes = yf.Search(
            company,
            max_results=8,
            news_count=0,
            lists_count=0,
            include_cb=False,
            recommended=0,
            raise_errors=False,
        ).quotes
    except Exception:
        return None
    candidates = [q for q in quotes if str(q.get("quoteType") or "").upper() == "EQUITY" and q.get("symbol")]
    if not candidates:
        return None
    target = norm(company)

    def score(q):
        names = [q.get("longname"), q.get("shortname"), q.get("displayName")]
        normalized = [norm(x) for x in names if x]
        best = 0
        for name in normalized:
            if name == target:
                best = max(best, 100)
            elif target and (name.startswith(target) or target.startswith(name)):
                best = max(best, 80)
            else:
                common = len(set(re.findall(r"[a-z0-9]+", company.lower())) & set(re.findall(r"[a-z0-9]+", " ".join(str(x) for x in names if x).lower())))
                best = max(best, common * 10)
        return best

    candidates.sort(key=score, reverse=True)
    return str(candidates[0]["symbol"])


def equity_value(fcf0, growth, years, wacc, terminal_growth, cash, debt):
    if wacc <= terminal_growth:
        return None
    fcf = fcf0
    pv = 0.0
    for year in range(1, years + 1):
        fcf *= 1 + growth
        pv += fcf / ((1 + wacc) ** year)
    terminal = fcf * (1 + terminal_growth) / (wacc - terminal_growth)
    return pv + terminal / ((1 + wacc) ** years) + cash - debt


def implied_growth(market_cap, fcf0, cash, debt):
    if not all(x is not None and math.isfinite(x) for x in [market_cap, fcf0, cash, debt]):
        return None
    if market_cap <= 0 or fcf0 <= 0:
        return None
    lo, hi = MIN_GROWTH, MAX_GROWTH
    vlo = equity_value(fcf0, lo, YEARS, WACC, TERMINAL_GROWTH, cash, debt)
    vhi = equity_value(fcf0, hi, YEARS, WACC, TERMINAL_GROWTH, cash, debt)
    if vlo is None or vhi is None or not (vlo <= market_cap <= vhi):
        return None
    for _ in range(100):
        mid = (lo + hi) / 2
        value = equity_value(fcf0, mid, YEARS, WACC, TERMINAL_GROWTH, cash, debt)
        if value is None:
            return None
        if value < market_cap:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def fetch_info(symbol: str, attempts: int = 3) -> dict:
    for attempt in range(attempts):
        try:
            info = yf.Ticker(symbol).info or {}
            if info:
                return info
        except Exception:
            pass
        if attempt < attempts - 1:
            time.sleep(1.5 * (attempt + 1))
    return {}


def forward_pe(info):
    direct = num(info.get("forwardPE"))
    if direct is not None:
        return direct
    price = num(info.get("currentPrice") or info.get("regularMarketPrice"))
    eps = num(info.get("forwardEps"))
    if price is not None and eps is not None and eps > 0:
        return price / eps
    return None


def main():
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    rows = source.get("companies") or []
    companies = []

    for source_row in rows:
        display = str(source_row.get("display_company") or source_row.get("match_company") or "").strip()
        if not display:
            continue
        symbol = resolve_symbol(display)
        if not symbol:
            print(f"WARNING: could not resolve public finance symbol for {display}")
            continue
        info = fetch_info(symbol)
        if not info:
            print(f"WARNING: no public fundamentals returned for {display}")
            continue

        market_cap = num(info.get("marketCap"))
        fcf = num(info.get("freeCashflow"))
        cash = num(info.get("totalCash")) or 0.0
        debt = num(info.get("totalDebt")) or 0.0
        implied = implied_growth(market_cap, fcf, cash, debt) if market_cap is not None and fcf is not None else None

        aliases = [display]
        match = str(source_row.get("match_company") or "").strip()
        if match and match not in aliases:
            aliases.append(match)

        companies.append({
            "company": display,
            "aliases": aliases,
            "forward_pe": forward_pe(info),
            "revenue_growth": num(info.get("revenueGrowth")),
            "operating_margin": num(info.get("operatingMargins")),
            "roe": num(info.get("returnOnEquity")),
            "reverse_dcf": {
                "implied_annual_fcf_growth": implied,
                "wacc": WACC,
                "terminal_growth": TERMINAL_GROWTH,
                "forecast_years": YEARS,
                "status": "Solved" if implied is not None else "Not meaningful / insufficient public FCF data",
            },
        })

    payload = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "source_note": "Public market characteristics refreshed during the GitHub Pages deployment. Company names are resolved with yfinance Search; reverse DCF uses a simplified 10-year FCF model with 9% WACC and 3% terminal growth.",
        "companies": companies,
    }
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Published fundamentals rows prepared: {len(companies)} / {len(rows)}")
    for field in ["forward_pe", "revenue_growth", "operating_margin", "roe"]:
        print(f"{field}: {sum(1 for x in companies if x.get(field) is not None)} / {len(companies)}")
    print(f"reverse_dcf: {sum(1 for x in companies if x.get('reverse_dcf', {}).get('implied_annual_fcf_growth') is not None)} / {len(companies)}")


if __name__ == "__main__":
    main()
