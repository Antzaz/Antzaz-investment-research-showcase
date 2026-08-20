(() => {
  const WINDOWS = [
    [31, '1M'],
    [92, '3M'],
    [183, '6M'],
    [365, '1Y'],
  ];

  const pct = (x, d = 1) =>
    x == null || !Number.isFinite(Number(x)) ? '—' : `${(Number(x) * 100).toFixed(d)}%`;

  function std(values) {
    if (!values || values.length < 2) return null;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(Math.max(variance, 0));
  }

  function parsedSeries(timeseries) {
    return (timeseries || [])
      .map(x => ({
        date: new Date(`${x.date}T00:00:00Z`),
        p: Number(x.portfolio_growth),
        b: Number(x.benchmark_growth),
      }))
      .filter(x => !Number.isNaN(x.date.getTime()) && Number.isFinite(x.p) && x.p > 0)
      .sort((a, b) => a.date - b.date);
  }

  function previousIndex(rows, targetDate, maxIndex = rows.length - 1) {
    let lo = 0, hi = maxIndex, ans = -1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (rows[mid].date <= targetDate) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  }

  function observationReturns(rows, startIndex, endIndex) {
    const out = [];
    for (let i = Math.max(1, startIndex + 1); i <= endIndex; i++) {
      const prev = rows[i - 1];
      const cur = rows[i];
      const p = cur.p / prev.p - 1;
      const b = Number.isFinite(cur.b) && cur.b > 0 && Number.isFinite(prev.b) && prev.b > 0
        ? cur.b / prev.b - 1
        : null;
      const days = Math.max(1, (cur.date - prev.date) / 86400000);
      out.push({ p, b, days });
    }
    return out;
  }

  function annualizationFactor(obs) {
    const gaps = obs.map(x => x.days).filter(x => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
    if (!gaps.length) return null;
    const mid = Math.floor(gaps.length / 2);
    const median = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
    return Math.sqrt(365.25 / Math.max(median, 1));
  }

  function windowReturn(rows, endIndex, days) {
    const end = rows[endIndex];
    const target = new Date(end.date.getTime() - days * 86400000);
    const startIndex = previousIndex(rows, target, endIndex - 1);
    if (startIndex < 0 || !(rows[startIndex].p > 0)) return null;
    return { value: end.p / rows[startIndex].p - 1, startIndex };
  }

  function deriveRollingRisk(timeseries) {
    const rows = parsedSeries(timeseries);
    if (rows.length < 10) return [];
    const out = [];

    for (const [days, label] of WINDOWS) {
      const latest = windowReturn(rows, rows.length - 1, days);
      if (!latest) continue;

      const all = [];
      for (let endIndex = 1; endIndex < rows.length; endIndex++) {
        const r = windowReturn(rows, endIndex, days);
        if (r) all.push(r.value);
      }

      const obs = observationReturns(rows, latest.startIndex, rows.length - 1);
      const factor = annualizationFactor(obs);
      const pStd = std(obs.map(x => x.p));
      const activeStd = std(obs.filter(x => Number.isFinite(x.b)).map(x => x.p - x.b));

      out.push({
        window: label,
        latest_return: latest.value,
        latest_volatility: pStd != null && factor != null ? pStd * factor : null,
        latest_tracking_error: activeStd != null && factor != null ? activeStd * factor : null,
        worst_rolling_return: all.length ? Math.min(...all) : null,
        best_rolling_return: all.length ? Math.max(...all) : null,
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

    const wrap = table.closest('.table-wrap');
    if (wrap && !wrap.parentElement.querySelector('.rolling-fallback-note')) {
      const note = document.createElement('p');
      note.className = 'footnote rolling-fallback-note';
      note.textContent = 'Fallback estimate derived from the published observation dates. The daily backend rolling-risk table is used whenever available.';
      wrap.insertAdjacentElement('afterend', note);
    }
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
