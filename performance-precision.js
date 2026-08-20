(() => {
  const pct = (x, d = 1) =>
    x == null || !Number.isFinite(Number(x)) ? '—' : `${(Number(x) * 100).toFixed(d)}%`;

  function dateOf(s) {
    const d = new Date(`${s}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function rowsOf(ts) {
    return (ts || [])
      .filter(x => dateOf(x.date) && Number.isFinite(Number(x.portfolio_growth)))
      .sort((a, b) => dateOf(a.date) - dateOf(b.date));
  }

  function previousRow(rows, start) {
    if (!start) return rows[0] || null;
    let found = null;
    for (const row of rows) {
      const d = dateOf(row.date);
      if (d < start) found = row;
      else break;
    }
    return found || rows[0] || null;
  }

  function endRow(rows, end = null) {
    if (!rows.length) return null;
    if (!end) return rows[rows.length - 1];
    let found = null;
    for (const row of rows) {
      const d = dateOf(row.date);
      if (d <= end) found = row;
      else break;
    }
    return found;
  }

  function periodReturn(rows, field, start = null, end = null, annualize = false) {
    const first = previousRow(rows, start);
    const last = endRow(rows, end);
    if (!first || !last) return null;
    const a = Number(first[field]);
    const b = Number(last[field]);
    if (!(a > 0 && b > 0) || dateOf(last.date) <= dateOf(first.date)) return null;
    const total = b / a - 1;
    if (!annualize) return total;
    const years = (dateOf(last.date) - dateOf(first.date)) / (365.25 * 86400000);
    return years > 0.5 ? Math.pow(b / a, 1 / years) - 1 : total;
  }

  function startOfQuarter(d) {
    return new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1));
  }

  function performanceRows(rows) {
    if (!rows.length) return [];
    const end = dateOf(rows[rows.length - 1].date);
    const starts = {
      MTD: new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1)),
      QTD: startOfQuarter(end),
      YTD: new Date(Date.UTC(end.getUTCFullYear(), 0, 1)),
      '1Y': new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), end.getUTCDate())),
      '3Y': new Date(Date.UTC(end.getUTCFullYear() - 3, end.getUTCMonth(), end.getUTCDate())),
      '5Y': new Date(Date.UTC(end.getUTCFullYear() - 5, end.getUTCMonth(), end.getUTCDate())),
    };
    return ['MTD', 'QTD', 'YTD', '1Y', '3Y', '5Y', 'Since analysis start'].map(label => {
      const annual = ['3Y', '5Y', 'Since analysis start'].includes(label);
      const start = label === 'Since analysis start' ? null : starts[label];
      const p = periodReturn(rows, 'portfolio_growth', start, null, annual);
      const b = periodReturn(rows, 'benchmark_growth', start, null, annual);
      return { label, p, b, active: p != null && b != null ? p - b : null, annual };
    });
  }

  function calendarReturns(rows) {
    if (!rows.length) return [];
    const years = [...new Set(rows.map(x => dateOf(x.date).getUTCFullYear()))].sort((a, b) => b - a).slice(0, 8);
    return years.map(year => {
      const start = new Date(Date.UTC(year, 0, 1));
      const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
      const p = periodReturn(rows, 'portfolio_growth', start, end, false);
      const b = periodReturn(rows, 'benchmark_growth', start, end, false);
      return { year, p, b, active: p != null && b != null ? p - b : null };
    }).filter(x => x.p != null);
  }

  function monthlyReturns(rows) {
    const values = {};
    const keys = [...new Set(rows.map(x => {
      const d = dateOf(x.date);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }))];
    for (const key of keys) {
      const [year, month] = key.split('-').map(Number);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
      values[key] = periodReturn(rows, 'portfolio_growth', start, end, false);
    }
    return values;
  }

  function patchMetric(container, label, value) {
    for (const metric of document.querySelectorAll(`${container} .metric`)) {
      if (metric.querySelector('.label')?.textContent?.trim() === label) {
        const el = metric.querySelector('.value');
        if (el) el.textContent = value;
      }
    }
  }

  function renderHeatmap(rows) {
    const el = document.querySelector('#monthlyHeatmap');
    if (!el || typeof Plotly === 'undefined') return;
    const vals = monthlyReturns(rows);
    const years = [...new Set(Object.keys(vals).map(k => Number(k.slice(0, 4))))]
      .sort((a, b) => b - a).slice(0, 6).sort((a, b) => a - b);
    if (!years.length) return;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const z = years.map(y => months.map((_, i) => vals[`${y}-${String(i + 1).padStart(2, '0')}`] ?? null));
    Plotly.react('monthlyHeatmap', [{
      type: 'heatmap',
      x: months,
      y: years.map(String),
      z,
      text: z.map(r => r.map(v => v == null ? '' : pct(v))),
      texttemplate: '%{text}',
      hovertemplate: '%{y} %{x}: %{z:.1%}<extra></extra>',
      zmid: 0,
    }], {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#dbe7f5' },
      margin: { l: 55, r: 20, t: 10, b: 40 },
    }, { responsive: true, displayModeBar: false });
  }

  async function run() {
    try {
      const [snapRes, benchRes] = await Promise.all([
        fetch(`data/portfolio_snapshot.json?v=${Date.now()}`, { cache: 'no-store' }),
        fetch(`data/benchmark_reference.json?v=${Date.now()}`, { cache: 'no-store' }),
      ]);
      if (!snapRes.ok) return;
      const snapshot = await snapRes.json();
      const bench = benchRes.ok ? await benchRes.json() : null;
      const rows = rowsOf(snapshot.timeseries || []);
      if (rows.length < 2) return;

      const perf = performanceRows(rows);
      const table = document.querySelector('#performanceTable');
      if (table) {
        table.innerHTML = `<thead><tr><th>Period</th><th>Model portfolio</th><th>Benchmark</th><th>Excess return</th></tr></thead><tbody>${perf.map(r => `<tr><td>${r.label}${r.annual ? ' <span class="annualized">annualized</span>' : ''}</td><td>${pct(r.p)}</td><td>${pct(r.b)}</td><td class="${(r.active ?? 0) >= 0 ? 'positive' : 'negative'}">${pct(r.active)}</td></tr>`).join('')}</tbody>`;
      }

      const cal = calendarReturns(rows);
      const calTable = document.querySelector('#calendarReturnTable');
      if (calTable) {
        calTable.innerHTML = `<thead><tr><th>Year</th><th>Model</th><th>Benchmark</th><th>Excess</th></tr></thead><tbody>${cal.map(r => `<tr><td>${r.year}</td><td>${pct(r.p)}</td><td>${pct(r.b)}</td><td>${pct(r.active)}</td></tr>`).join('')}</tbody>`;
      }
      renderHeatmap(rows);

      const ytd = perf.find(x => x.label === 'YTD');
      patchMetric('#overviewMetrics', 'YTD model', pct(ytd?.p));
      patchMetric('#overviewMetrics', 'YTD benchmark', pct(ytd?.b));
      patchMetric('#overviewMetrics', 'YTD excess', pct(ytd?.active));

      const asof = document.querySelector('#performanceAsOf');
      if (asof) asof.textContent = `Through ${rows[rows.length - 1].date}`;

      const freshness = document.querySelector('#freshness');
      if (freshness) {
        const md = snapshot.metadata || {};
        const analytics = md.public_analytics_generated_utc;
        const base = md.base_snapshot_generated_utc || snapshot.generated_utc;
        const parts = [];
        if (analytics) parts.push(`Public analytics: ${analytics}`);
        if (base) parts.push(`Thesis/base snapshot: ${base}`);
        if (bench?.as_of) parts.push(`Benchmark sector reference: ${bench.as_of}`);
        if (parts.length) freshness.textContent = parts.join(' · ');
      }
    } catch (error) {
      console.warn('Performance precision patch skipped:', error);
    }
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (document.querySelector('#performanceTable tbody') || attempts >= 30) {
      clearInterval(timer);
      run();
    }
  }, 250);
})();
