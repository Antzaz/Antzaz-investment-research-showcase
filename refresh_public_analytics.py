from __future__ import annotations

import json
import math
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parent
SNAPSHOT_PATH = ROOT / "data" / "portfolio_snapshot.json"
OVERRIDES_PATH = ROOT / "data" / "thesis_overrides.json"
ANALYTICS_PATH = ROOT / "data" / "public_analytics.json"
FUNDAMENTALS_PATH = ROOT / "data" / "public_fundamentals.json"

BENCHMARK = "SPY"
TRADING_DAYS = 252
RISK_FREE_RATE = 0.04
HISTORY_PERIOD = "10y"
WACC = 0.09
TERMINAL_GROWTH = 0.03
FORECAST_YEARS = 10
MIN_GROWTH = -0.20
MAX_GROWTH = 0.50

SYMBOLS = {
    "Alphabet Inc.": "GOOGL",
    "Amazon.com, Inc.": "AMZN",
    "NVIDIA Corporation": "NVDA",
    "JPMorgan Chase & Co.": "JPM",
    "Berkshire Hathaway Inc.": "BRK-B",
    "Schneider Electric SE": "SU.PA",
    "Chevron Corporation": "CVX",
    "Taiwan Semiconductor Manufacturing Company Limited": "TSM",
    "Lumentum Holdings Inc.": "LITE",
    "Universal Health Services, Inc.": "UHS",
    "Sanofi": "SNY",
    "TotalEnergies SE": "TTE",
    "Medpace Holdings, Inc.": "MEDP",
    "Cummins Inc.": "CMI",
    "Microsoft Corporation": "MSFT",
}

FACTOR_PROXIES = {
    "Market_SPY": "SPY",
    "SmallCap_IWM": "IWM",
    "Value_IWD": "IWD",
    "Growth_IWF": "IWF",
    "Momentum_MTUM": "MTUM",
    "Quality_QUAL": "QUAL",
    "LowVol_USMV": "USMV",
}

HISTORICAL_STRESS = [
    {"scenario": "COVID shock", "start": "2020-02-19", "end": "2020-03-23"},
    {"scenario": "2022 rate / growth selloff", "start": "2022-01-03", "end": "2022-10-12"},
]


def num(value):
    try:
        x = float(value)
        return x if math.isfinite(x) else None
    except Exception:
        return None


def safe_json(value):
    if isinstance(value, dict):
        return {k: safe_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [safe_json(v) for v in value]
    if isinstance(value, (np.floating, np.integer)):
        value = value.item()
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.isoformat()
    return value


def apply_overrides(snapshot: dict, overrides: dict) -> tuple[list[dict], dict[str, dict]]:
    by_match = {str(x.get("match_company")): x for x in overrides.get("companies", [])}
    alias_map: dict[str, dict] = {}
    holdings = []
    for row in snapshot.get("holdings", []):
        raw_name = str(row.get("company") or "").strip()
        override = by_match.get(raw_name)
        out = dict(row)
        if override:
            out["company"] = override.get("display_company") or raw_name
            out["expected_annual_return"] = (
                out.get("expected_annual_return")
                if out.get("expected_annual_return") is not None
                else override.get("expected_annual_return")
            )
            out["country"] = out.get("country") or override.get("country")
            out["currency"] = out.get("currency") or override.get("currency")
        holdings.append(out)
        alias_map[out["company"]] = {
            "match_company": raw_name,
            "display_company": out["company"],
            "expected_annual_return": out.get("expected_annual_return"),
            "country": out.get("country"),
            "currency": out.get("currency"),
        }
    return holdings, alias_map


def download_prices(symbols: list[str]) -> pd.DataFrame:
    raw = yf.download(
        tickers=list(dict.fromkeys(symbols)),
        period=HISTORY_PERIOD,
        auto_adjust=True,
        progress=False,
        threads=True,
        group_by="column",
    )
    if raw.empty:
        raise RuntimeError("No price history returned by Yahoo Finance.")
    if isinstance(raw.columns, pd.MultiIndex):
        if "Close" not in raw.columns.get_level_values(0):
            raise RuntimeError("Price download did not contain Close data.")
        close = raw["Close"].copy()
    else:
        close = raw[["Close"]].copy()
        close.columns = symbols[:1]
    if isinstance(close, pd.Series):
        close = close.to_frame(name=symbols[0])
    close = close.dropna(how="all").sort_index()
    close.columns = [str(c).upper() for c in close.columns]
    return close


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


def forward_pe(info: dict):
    direct = num(info.get("forwardPE"))
    if direct is not None:
        return direct
    price = num(info.get("currentPrice") or info.get("regularMarketPrice"))
    eps = num(info.get("forwardEps"))
    if price is not None and eps is not None and eps > 0:
        return price / eps
    return None


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
    vals = [market_cap, fcf0, cash, debt]
    if not all(v is not None and math.isfinite(float(v)) for v in vals):
        return None
    if market_cap <= 0 or fcf0 <= 0:
        return None
    lo, hi = MIN_GROWTH, MAX_GROWTH
    vlo = equity_value(fcf0, lo, FORECAST_YEARS, WACC, TERMINAL_GROWTH, cash, debt)
    vhi = equity_value(fcf0, hi, FORECAST_YEARS, WACC, TERMINAL_GROWTH, cash, debt)
    if vlo is None or vhi is None or not (vlo <= market_cap <= vhi):
        return None
    for _ in range(100):
        mid = (lo + hi) / 2
        value = equity_value(fcf0, mid, FORECAST_YEARS, WACC, TERMINAL_GROWTH, cash, debt)
        if value is None:
            return None
        if value < market_cap:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def ann_return(r: pd.Series) -> float | None:
    r = r.dropna()
    if r.empty:
        return None
    return float((1 + r).prod() ** (TRADING_DAYS / len(r)) - 1)


def max_drawdown(r: pd.Series) -> float | None:
    r = r.dropna()
    if r.empty:
        return None
    wealth = (1 + r).cumprod()
    return float((wealth / wealth.cummax() - 1).min())


def std_annualized(r: pd.Series) -> float | None:
    r = r.dropna()
    if len(r) < 2:
        return None
    return float(r.std(ddof=1) * math.sqrt(TRADING_DAYS))


def rolling_risk_table(p: pd.Series, b: pd.Series) -> list[dict]:
    out = []
    b = b.reindex(p.index)
    for window, label in [(21, "1M"), (63, "3M"), (126, "6M"), (252, "1Y")]:
        if len(p) < window:
            continue
        roll_ret = (1 + p).rolling(window).apply(np.prod, raw=True) - 1
        ann_vol = p.rolling(window).std(ddof=1) * math.sqrt(TRADING_DAYS)
        te = (p - b).rolling(window).std(ddof=1) * math.sqrt(TRADING_DAYS)
        out.append({
            "window": label,
            "latest_return": num(roll_ret.dropna().iloc[-1]) if not roll_ret.dropna().empty else None,
            "latest_volatility": num(ann_vol.dropna().iloc[-1]) if not ann_vol.dropna().empty else None,
            "latest_tracking_error": num(te.dropna().iloc[-1]) if not te.dropna().empty else None,
            "worst_rolling_return": num(roll_ret.min()) if roll_ret.notna().any() else None,
            "best_rolling_return": num(roll_ret.max()) if roll_ret.notna().any() else None,
        })
    return out


def historical_stress_table(p: pd.Series, b: pd.Series) -> list[dict]:
    rows = []
    for sc in HISTORICAL_STRESS:
        start, end = pd.Timestamp(sc["start"]), pd.Timestamp(sc["end"])
        pr = p.loc[(p.index >= start) & (p.index <= end)].dropna()
        br = b.loc[(b.index >= start) & (b.index <= end)].dropna()
        pv = float((1 + pr).prod() - 1) if not pr.empty else None
        bv = float((1 + br).prod() - 1) if not br.empty else None
        rows.append({
            "scenario": sc["scenario"],
            "start": sc["start"],
            "end": sc["end"],
            "portfolio_return": pv,
            "benchmark_return": bv,
            "active_return": (pv - bv) if pv is not None and bv is not None else None,
        })
    return rows


def main():
    snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
    overrides = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    holdings, alias_map = apply_overrides(snapshot, overrides)

    missing_symbols = [h["company"] for h in holdings if h.get("company") not in SYMBOLS]
    if missing_symbols:
        raise SystemExit(f"Missing public symbol mapping for: {', '.join(missing_symbols)}")

    symbols = [SYMBOLS[h["company"]] for h in holdings]
    all_symbols = list(dict.fromkeys(symbols + [BENCHMARK] + list(FACTOR_PROXIES.values())))
    prices = download_prices(all_symbols)

    missing_prices = [s for s in symbols + [BENCHMARK] if s not in prices.columns]
    if missing_prices:
        raise SystemExit(f"Missing price history for: {', '.join(missing_prices)}")

    fundamentals_rows = []
    reverse_dcf_rows = []
    enriched_holdings = []
    for h in holdings:
        company = h["company"]
        symbol = SYMBOLS[company]
        info = fetch_info(symbol)

        market_cap = num(info.get("marketCap"))
        fcf = num(info.get("freeCashflow"))
        cash = num(info.get("totalCash")) or 0.0
        debt = num(info.get("totalDebt")) or 0.0
        implied = implied_growth(market_cap, fcf, cash, debt) if market_cap is not None and fcf is not None else None

        row = {
            **h,
            "sector": info.get("sector") or h.get("sector"),
            "industry": info.get("industry") or h.get("industry"),
            "country": info.get("country") or h.get("country"),
            "currency": info.get("currency") or h.get("currency"),
            "forward_pe": forward_pe(info),
            "revenue_growth": num(info.get("revenueGrowth")),
            "operating_margin": num(info.get("operatingMargins")),
            "roe": num(info.get("returnOnEquity")),
        }
        enriched_holdings.append(row)
        aliases = list(dict.fromkeys([company, alias_map.get(company, {}).get("match_company")]))
        aliases = [x for x in aliases if x and x != company]
        fundamentals_rows.append({
            "company": company,
            "aliases": aliases,
            "forward_pe": row["forward_pe"],
            "revenue_growth": row["revenue_growth"],
            "operating_margin": row["operating_margin"],
            "roe": row["roe"],
            "reverse_dcf": {
                "implied_annual_fcf_growth": implied,
                "wacc": WACC,
                "terminal_growth": TERMINAL_GROWTH,
                "forecast_years": FORECAST_YEARS,
                "status": "Solved" if implied is not None else "Not meaningful / insufficient public FCF data",
            },
        })
        reverse_dcf_rows.append({
            "company": company,
            "implied_annual_fcf_growth": implied,
            "wacc": WACC,
            "terminal_growth": TERMINAL_GROWTH,
            "forecast_years": FORECAST_YEARS,
            "status": "Solved" if implied is not None else "Not meaningful / insufficient public FCF data",
        })

    weights = pd.Series(
        {SYMBOLS[h["company"]]: float(h.get("weight") or 0) for h in enriched_holdings},
        dtype=float,
    )
    if weights.sum() <= 0:
        raise SystemExit("Published portfolio weights are unavailable.")
    weights = weights / weights.sum()

    asset_returns = prices[symbols].pct_change(fill_method=None)
    benchmark_returns = prices[BENCHMARK].pct_change(fill_method=None)
    common = asset_returns.index.intersection(benchmark_returns.dropna().index)
    r = asset_returns.loc[common].dropna(how="any")
    b = benchmark_returns.loc[r.index].dropna()
    r = r.loc[b.index]
    if len(r) < 252:
        raise SystemExit(f"Insufficient common price history: {len(r)} observations")

    w = weights.reindex(r.columns).fillna(0.0)
    w = w / w.sum()
    p = r.mul(w, axis=1).sum(axis=1)
    b = b.reindex(p.index)

    p_ann = ann_return(p)
    b_ann = ann_return(b)
    active_ann = (p_ann - b_ann) if p_ann is not None and b_ann is not None else None
    ann_vol = std_annualized(p)
    downside = std_annualized(p[p < 0])
    sharpe = ((p_ann - RISK_FREE_RATE) / ann_vol) if p_ann is not None and ann_vol not in (None, 0) else None
    sortino = ((p_ann - RISK_FREE_RATE) / downside) if p_ann is not None and downside not in (None, 0) else None
    active = p - b
    te = std_annualized(active)
    ir = (active_ann / te) if active_ann is not None and te not in (None, 0) else None
    corr = num(p.corr(b))
    up = b > 0
    down = b < 0
    up_capture = num(p[up].mean() / b[up].mean()) if up.any() and b[up].mean() != 0 else None
    down_capture = num(p[down].mean() / b[down].mean()) if down.any() and b[down].mean() != 0 else None
    hit_rate = num((p > b).mean())
    beta = num(np.cov(p, b, ddof=1)[0, 1] / np.var(b, ddof=1)) if np.var(b, ddof=1) > 0 else None
    var95 = num(p.quantile(0.05))
    tail = p[p <= p.quantile(0.05)]
    es95 = num(tail.mean()) if not tail.empty else None
    rf_daily = (1 + RISK_FREE_RATE) ** (1 / TRADING_DAYS) - 1
    alpha_daily = ((p - rf_daily).mean() - beta * (b - rf_daily).mean()) if beta is not None else None
    alpha_ann = num(alpha_daily * TRADING_DAYS) if alpha_daily is not None else None

    cov = r.cov() * TRADING_DAYS
    w_arr = w.to_numpy()
    cov_arr = cov.to_numpy()
    port_var = float(w_arr.T @ cov_arr @ w_arr)
    port_vol = math.sqrt(max(port_var, 0))
    marginal = cov_arr @ w_arr / port_vol if port_vol > 0 else np.full(len(w_arr), np.nan)
    component = w_arr * marginal
    risk_pct = component / port_vol if port_vol > 0 else np.full(len(w_arr), np.nan)
    risk_map = {symbol: num(value) for symbol, value in zip(r.columns, risk_pct)}

    for h in enriched_holdings:
        h["risk_contribution"] = risk_map.get(SYMBOLS[h["company"]], h.get("risk_contribution"))

    weight_values = np.array([float(h.get("weight") or 0) for h in enriched_holdings], dtype=float)
    weight_values = weight_values / weight_values.sum()
    ordered = np.sort(weight_values)[::-1]
    hhi = float(np.sum(weight_values ** 2))
    sectors = {}
    for h in enriched_holdings:
        sector = h.get("sector") or "Unknown"
        sectors[sector] = sectors.get(sector, 0.0) + float(h.get("weight") or 0)
    sector_hhi = float(sum(v * v for v in sectors.values()))
    metrics = {
        **(snapshot.get("metrics") or {}),
        "annualized_return": p_ann,
        "benchmark_annualized_return": b_ann,
        "active_annualized_return": active_ann,
        "annualized_volatility": ann_vol,
        "sharpe": num(sharpe),
        "sortino": num(sortino),
        "tracking_error": te,
        "information_ratio": num(ir),
        "max_drawdown": max_drawdown(p),
        "beta": beta,
        "benchmark_correlation": corr,
        "up_capture": up_capture,
        "down_capture": down_capture,
        "daily_active_hit_rate": hit_rate,
        "daily_var_95": var95,
        "daily_expected_shortfall_95": es95,
        "annualized_alpha": alpha_ann,
        "top_1_weight": num(ordered[:1].sum()),
        "top_3_weight": num(ordered[:3].sum()),
        "top_5_weight": num(ordered[:5].sum()),
        "herfindahl_index": hhi,
        "effective_number_of_holdings": num(1 / hhi) if hhi > 0 else None,
        "sector_herfindahl_index": sector_hhi,
        "effective_number_of_sectors": num(1 / sector_hhi) if sector_hhi > 0 else None,
        "largest_risk_contribution": max((x for x in risk_map.values() if x is not None), default=None),
    }

    def weighted(field):
        usable = [(float(h.get("weight") or 0), num(h.get(field))) for h in enriched_holdings]
        usable = [(wt, val) for wt, val in usable if wt > 0 and val is not None]
        denom = sum(wt for wt, _ in usable)
        return (sum(wt * val for wt, val in usable) / denom) if denom > 0 else None

    portfolio_characteristics = {
        "weighted_forward_pe": weighted("forward_pe"),
        "weighted_revenue_growth": weighted("revenue_growth"),
        "weighted_operating_margin": weighted("operating_margin"),
        "weighted_roe": weighted("roe"),
    }

    attribution = []
    for h in enriched_holdings:
        symbol = SYMBOLS[h["company"]]
        x = r[symbol].dropna()
        attribution.append({
            "company": h["company"],
            "weight": num(w[symbol]),
            "asset_total_return": num((1 + x).prod() - 1) if not x.empty else None,
            "contribution": num((r[symbol] * w[symbol]).sum()),
        })

    factors = []
    proxy_prices = prices[[x for x in FACTOR_PROXIES.values() if x in prices.columns]]
    proxy_returns = proxy_prices.pct_change(fill_method=None)
    for name, symbol in FACTOR_PROXIES.items():
        if symbol not in proxy_returns.columns:
            continue
        x = proxy_returns[symbol].reindex(p.index).dropna()
        idx = p.index.intersection(x.index)
        if len(idx) < 60:
            continue
        xx, yy = x.loc[idx], p.loc[idx]
        var = np.var(xx, ddof=1)
        exposure = num(np.cov(yy, xx, ddof=1)[0, 1] / var) if var > 0 else None
        if exposure is not None:
            factors.append({"factor": name, "exposure": exposure})

    timeseries = []
    pg = (1 + p).cumprod()
    bg = (1 + b.fillna(0)).cumprod()
    for date in p.index:
        timeseries.append({
            "date": pd.Timestamp(date).date().isoformat(),
            "portfolio_growth": num(pg.loc[date]),
            "benchmark_growth": num(bg.loc[date]),
        })

    analytics = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "source_note": (
            "Public-only current-weight research refresh generated inside the showcase repository. "
            "It uses the already-published company names and portfolio weights plus public market data. "
            "No shares, cost basis, transactions, private notes, portfolio value or credentials are used."
        ),
        "metadata": {
            "benchmark": "S&P 500",
            "benchmark_proxy": BENCHMARK,
            "analysis_start": timeseries[0]["date"] if timeseries else None,
            "analysis_end": timeseries[-1]["date"] if timeseries else None,
            "track_record_type": "Current-weight historical research model",
            "performance_basis": (
                "Current published portfolio weights are applied retrospectively across common adjusted-price history. "
                "This is a research model, not transaction-weighted realized client performance."
            ),
            "currency_basis": (
                "Returns use the portfolio's public listing proxies and adjusted prices. "
                "Foreign-exchange effects are not normalized to a single reporting currency."
            ),
            "public_refresh_basis": "Public-only fallback analytics; private portfolio economics are not used.",
        },
        "metrics": metrics,
        "portfolio_characteristics": portfolio_characteristics,
        "holdings": enriched_holdings,
        "attribution": attribution,
        "factors": factors,
        "historical_stress": historical_stress_table(p, b),
        "rolling_risk": rolling_risk_table(p, b),
        "reverse_dcf": reverse_dcf_rows,
        "timeseries": timeseries,
    }

    fundamentals = {
        "generated_utc": analytics["generated_utc"],
        "source_note": (
            "Public market characteristics refreshed independently from the private research pipeline. "
            "Forward P/E uses public forward P/E or price/forward-EPS fallback. "
            "Reverse DCF uses a simplified 10-year FCF model with 9% WACC and 3% terminal growth."
        ),
        "companies": fundamentals_rows,
    }

    ANALYTICS_PATH.write_text(json.dumps(safe_json(analytics), indent=2, ensure_ascii=False), encoding="utf-8")
    FUNDAMENTALS_PATH.write_text(json.dumps(safe_json(fundamentals), indent=2, ensure_ascii=False), encoding="utf-8")

    coverage = {
        "holdings": len(enriched_holdings),
        "timeseries": len(timeseries),
        "attribution": len(attribution),
        "rolling_risk": len(analytics["rolling_risk"]),
        "historical_stress": len(analytics["historical_stress"]),
        "reverse_dcf_solved": sum(1 for x in reverse_dcf_rows if x["implied_annual_fcf_growth"] is not None),
        "forward_pe": sum(1 for x in enriched_holdings if x.get("forward_pe") is not None),
        "revenue_growth": sum(1 for x in enriched_holdings if x.get("revenue_growth") is not None),
        "operating_margin": sum(1 for x in enriched_holdings if x.get("operating_margin") is not None),
        "roe": sum(1 for x in enriched_holdings if x.get("roe") is not None),
    }
    print("Public analytics coverage:", json.dumps(coverage, indent=2))

    if coverage["holdings"] != len(holdings):
        raise SystemExit("Public analytics holding coverage is incomplete.")
    if coverage["timeseries"] < 252:
        raise SystemExit("Public analytics history is too short.")
    if min(coverage["forward_pe"], coverage["revenue_growth"], coverage["operating_margin"], coverage["roe"]) < max(5, len(holdings) // 2):
        raise SystemExit("Fundamental coverage is too low; refusing to publish a mostly-empty research refresh.")


if __name__ == "__main__":
    main()
