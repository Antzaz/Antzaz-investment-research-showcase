(() => {
  const WINDOWS = [
    [21, '1M'],
    [63, '3M'],
    [126, '6M'],
    [252, '1Y'],
  ];
  const TRADING_DAYS = 252;

  const pct = (x, d = 1) => x == null || !Number.isFinite(Number(x)) ? '—' : `${(Number(x) * 100).toFixed(d)}%`;

  function std(values) {
    if (!values || values.length < 2) return null;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(Math.max(variance, 0));
  }

  function productReturn(values) {
    if (!values?.length) return null;
    return values.reduce((acc, r) => acc * (1 + r), 1) - 1;
  }

  function dailyReturns(timeseries) {
    const rows = [];
    const ts = (timeseries || [])
      .filter(x => Number.isFinite(Number(x.portfolio_growth)))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    for (let i = 1; i < ts.length; i++) {
      const p0 = Number(ts[i - 1].portfolio_growth);
      const p1 = Number(ts[i].portfolio_growth);
      const b0 = Number(ts[i - 1].benchmark_growth);
      const b1 = Number(ts[i].benchmark_growth);
      if (!(p0 > 0 && p1 > 0)) continue;
      const p = p1 / p0 - 1;
      const b = b0 > 0 && b1 > 0 ? b1 / b0 - 1 : null;
      rows.push({ p, b });
    }
    return rows;
  }

  function deriveRollingRisk(timeseries) {
    const returns = dailyReturns(timeseries);
    const out = [];

    for (const [window, label] of WINDOWS) {
      if (returns.length < window) continue;

      const allRolling = [];
      for (let end = window; end <= returns.length; end++) {
        const slice = returns.slice(end - window, end).map(x => x.p);
        allRolling.push(productReturn(slice));
      }

      const latest = returns.slice(-window);
      const latestP = latest.map(x => x.p);
      const latestActive = latest
        .filter(x => Number.isFinite(x.b))
        .map(x => x.p - x.b);
      const vol = std(latestP);
      const te = std(latestActive);

      out.push({
        window: label,
        latest_return: productReturn(latestP),
        latest_volatility: vol == null ? null : vol * Math.sqrt(TRADING_DAYS),
        latest_tracking_error: te == null ? null : te * Math.sqrt(TRADING_DAYS),
        worst_rolling_return: allRolling.length ? Math.min(...allRolling) : null,
        best_rolling_return: allRolling.length ? Math.max(...allRolling) : null,
      });
    }
    return out;
  }

  function tableLooksMissing(table) {
    const text = table?.textContent || '';
    return !table || !table.querySelector('thead') || /populate after|unavailable|no history/i.test(text);
  }

  function writeRows(table, rows) {
    if (!table || !rows.length) return false;
    table.innerHTML = `<thead><tr><th>Window</th><th>Latest return</th><th>Volatility</th><th>Tracking error</th><th>Worst rolling</th><th>Best rolling</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.window}</td><td>${pct(r.latest_return)}</td><td>${pct(r.latest_volatility)}</td><td>${pct(r.latest_tracking_error)}</td><td>${pct(r.worst_rolling_return)}</td><td>${pct(r.best_rolling_return)}</td></tr>`).join('')}</tbody>`;
    table.dataset.clientRollingRisk = 'true';
    return true;
  }

  async function run() {
    let snapshot;
    try {
      const response = await fetch(`data/portfolio_snapshot.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      snapshot = await response.json();
    } catch (_) {
      return;
    }

    // Prefer backend-generated rolling risk whenever it is present.
    if (Array.isArray(snapshot.rolling_risk) && snapshot.rolling_risk.length) return;

    const rows = deriveRollingRisk(snapshot.timeseries || []);
    if (!rows.length) return;

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      const table = document.querySelector('#rollingRiskTable');
      if (table && tableLooksMissing(table)) {
        writeRows(table, rows);
        clearInterval(timer);
      } else if (table?.dataset.clientRollingRisk === 'true' || attempts >= 30) {
        clearInterval(timer);
      }
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
