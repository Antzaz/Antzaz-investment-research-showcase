(() => {
  if (window.__antzazShortTermPerformanceLoaded) return;
  window.__antzazShortTermPerformanceLoaded = true;

  const DATA_URL = 'data/short_term_performance.json';
  const PRIMARY_PERIODS = ['1D', '1W', '1M', '3M', 'YTD', '1Y'];

  const pct = value => {
    const x = Number(value);
    if (!Number.isFinite(x)) return '—';
    const sign = x > 0 ? '+' : '';
    return `${sign}${(x * 100).toFixed(2)}%`;
  };

  const tone = value => {
    const x = Number(value);
    if (!Number.isFinite(x) || Math.abs(x) < 1e-12) return 'neutral';
    return x > 0 ? 'positive' : 'negative';
  };

  function installStyles() {
    if (document.getElementById('short-term-performance-styles')) return;
    const style = document.createElement('style');
    style.id = 'short-term-performance-styles';
    style.textContent = `
      .short-term-performance-card { margin-bottom: 1.25rem; }
      .short-term-performance-head { display:flex; gap:1rem; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; margin-bottom:1rem; }
      .short-term-performance-head h2 { margin:.15rem 0 .25rem; }
      .short-term-performance-asof { font-size:.82rem; opacity:.75; white-space:nowrap; }
      .short-term-performance-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(145px,1fr)); gap:.8rem; }
      .short-term-return-card { border:1px solid rgba(150,180,210,.18); background:rgba(255,255,255,.025); border-radius:12px; padding:.9rem 1rem; min-height:112px; }
      .short-term-return-card .period { font-size:.75rem; letter-spacing:.08em; text-transform:uppercase; opacity:.72; }
      .short-term-return-card .portfolio-return { font-size:1.65rem; font-weight:750; line-height:1.15; margin:.35rem 0 .55rem; }
      .short-term-return-card .portfolio-return.positive, .short-term-return-card .excess.positive { color:#42d392; }
      .short-term-return-card .portfolio-return.negative, .short-term-return-card .excess.negative { color:#ff7b86; }
      .short-term-return-card .portfolio-return.neutral, .short-term-return-card .excess.neutral { color:inherit; }
      .short-term-return-card .comparison { font-size:.78rem; line-height:1.45; opacity:.78; }
      .short-term-return-card .excess { font-weight:650; }
      .short-term-performance-note { margin:.85rem 0 0; font-size:.78rem; opacity:.7; line-height:1.5; }
      @media (max-width:680px){ .short-term-performance-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    `;
    document.head.appendChild(style);
  }

  function card(row) {
    const excessTone = tone(row.excess_return);
    const portfolioTone = tone(row.portfolio_return);
    return `
      <div class="short-term-return-card">
        <div class="period">${row.period}</div>
        <div class="portfolio-return ${portfolioTone}">${pct(row.portfolio_return)}</div>
        <div class="comparison">
          S&amp;P 500 ${pct(row.benchmark_return)}<br>
          Excess <span class="excess ${excessTone}">${pct(row.excess_return)}</span>
        </div>
      </div>
    `;
  }

  function sectionMarkup(data, idSuffix) {
    const map = new Map((data.periods || []).map(row => [row.period, row]));
    const rows = PRIMARY_PERIODS.map(p => map.get(p)).filter(Boolean);
    if (!rows.length) return '';
    return `
      <article class="card short-term-performance-card" id="shortTermPerformance-${idSuffix}">
        <div class="short-term-performance-head">
          <div>
            <p class="eyebrow">PORTFOLIO CHANGE</p>
            <h2>Daily, weekly & longer-term performance</h2>
            <p class="muted">Aggregate model-portfolio return, benchmark return and excess return.</p>
          </div>
          <div class="short-term-performance-asof">Through ${data.as_of || 'latest available date'}</div>
        </div>
        <div class="short-term-performance-grid">${rows.map(card).join('')}</div>
        <p class="short-term-performance-note">
          1D = latest benchmark trading session; 1W = 5 sessions; 1M = 21; 3M = 63; 1Y = 252. YTD is the compounded return for the current calendar year. ${data.methodology || ''}
        </p>
      </article>
    `;
  }

  function render(data) {
    installStyles();

    const overview = document.getElementById('overview');
    if (overview && !document.getElementById('shortTermPerformance-overview')) {
      const notice = overview.querySelector('.notice-card');
      const wrapper = document.createElement('div');
      wrapper.innerHTML = sectionMarkup(data, 'overview');
      const node = wrapper.firstElementChild;
      if (node) {
        if (notice && notice.nextSibling) notice.parentNode.insertBefore(node, notice.nextSibling);
        else overview.prepend(node);
      }
    }

    const performance = document.getElementById('performance');
    if (performance && !document.getElementById('shortTermPerformance-performance')) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = sectionMarkup(data, 'performance');
      const node = wrapper.firstElementChild;
      if (node) performance.prepend(node);
    }
  }

  fetch(`${DATA_URL}?v=${Date.now()}`, { cache: 'no-store' })
    .then(response => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
    .then(render)
    .catch(error => console.warn('Short-term performance summary unavailable:', error));
})();
