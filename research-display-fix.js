(() => {
  let fundamentals = null;
  let analytics = null;

  const finite = value => value !== null && value !== undefined && Number.isFinite(Number(value));
  const pct = (value, digits = 1) => finite(value) ? `${(Number(value) * 100).toFixed(digits)}%` : '—';
  const mult = (value, digits = 1) => finite(value) ? `${Number(value).toFixed(digits)}x` : '—';
  const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

  async function fetchJson(path) {
    try {
      const response = await fetch(`${path}?v=${Date.now()}`, { cache: 'no-store' });
      return response.ok ? await response.json() : null;
    } catch (_) {
      return null;
    }
  }

  async function loadPublicData() {
    const [f, a] = await Promise.all([
      fetchJson('data/public_fundamentals.json'),
      fetchJson('data/public_analytics.json'),
    ]);
    fundamentals = f;
    analytics = a;
  }

  function findFundamental(company) {
    if (!fundamentals) return null;
    const target = norm(company);
    return (fundamentals.companies || []).find(row => {
      const names = [row.company, ...(row.aliases || [])];
      return names.some(name => norm(name) === target);
    }) || null;
  }

  function metricByLabel(container, label) {
    return [...container.querySelectorAll('.metric')].find(metric =>
      metric.querySelector('.label')?.textContent?.trim() === label
    ) || null;
  }

  function setMetric(container, label, text, subtext = null) {
    const metric = metricByLabel(container, label);
    if (!metric) return;
    const value = metric.querySelector('.value');
    if (value && value.textContent !== text) value.textContent = text;
    if (subtext) {
      let sub = metric.querySelector('.metric-sub');
      if (!sub) {
        sub = document.createElement('div');
        sub.className = 'metric-sub';
        metric.appendChild(sub);
      }
      if (sub.textContent !== subtext) sub.textContent = subtext;
    }
  }

  function patchResearchMetrics() {
    const select = document.querySelector('#researchCompanySelect');
    const detail = document.querySelector('#researchDetail');
    if (!select || !detail || select.selectedIndex < 0) return;

    const company = select.options[select.selectedIndex]?.textContent?.trim();
    const row = findFundamental(company);
    if (!row) return;

    const metrics = detail.querySelector('.research-metrics');
    if (!metrics) return;

    setMetric(metrics, 'Forward P/E', mult(row.forward_pe));
    setMetric(metrics, 'Revenue growth', pct(row.revenue_growth));
    setMetric(metrics, 'Operating margin', pct(row.operating_margin));
    setMetric(metrics, 'ROE', pct(row.roe));

    const dcf = row.reverse_dcf || {};
    if (finite(dcf.implied_annual_fcf_growth)) {
      setMetric(metrics, 'Reverse-DCF FCF growth', pct(dcf.implied_annual_fcf_growth));
    } else if (dcf.status) {
      setMetric(
        metrics,
        'Reverse-DCF FCF growth',
        'N/M',
        'Not meaningful / insufficient public FCF data'
      );
    }

    const valuationBlock = [...detail.querySelectorAll('.research-copy')].find(block =>
      /Valuation & market expectations/i.test(block.querySelector('h3')?.textContent || '')
    );
    if (valuationBlock) {
      let footnote = valuationBlock.querySelector('.footnote');
      if (!footnote) {
        footnote = document.createElement('p');
        footnote.className = 'footnote';
        valuationBlock.appendChild(footnote);
      }
      const text = finite(dcf.implied_annual_fcf_growth)
        ? `Reverse DCF: ${pct(dcf.implied_annual_fcf_growth)} implied annual FCF growth over ${Number(dcf.forecast_years || 10).toFixed(0)} years using ${pct(dcf.wacc)} WACC and ${pct(dcf.terminal_growth)} terminal growth.`
        : 'Reverse DCF: not meaningful / insufficient public FCF data for this business under the simplified corporate FCF model.';
      if (footnote.textContent !== text) footnote.textContent = text;
    }
  }

  function patchOverviewFundamentals() {
    const container = document.querySelector('#characteristicMetrics');
    const c = analytics?.portfolio_characteristics || {};
    if (!container || !Object.keys(c).length) return;
    setMetric(container, 'Forward P/E', mult(c.weighted_forward_pe));
    setMetric(container, 'Revenue growth', pct(c.weighted_revenue_growth));
    setMetric(container, 'Operating margin', pct(c.weighted_operating_margin));
    setMetric(container, 'ROE', pct(c.weighted_roe));
  }

  function patchRiskMetrics() {
    const container = document.querySelector('#riskMetrics');
    const m = analytics?.metrics || {};
    if (!container || !Object.keys(m).length) return;
    setMetric(container, 'Tracking error', pct(m.tracking_error));
    setMetric(container, 'Information ratio', finite(m.information_ratio) ? Number(m.information_ratio).toFixed(2) : '—');
    setMetric(container, 'Beta', finite(m.beta) ? Number(m.beta).toFixed(2) : '—');
    setMetric(container, 'Benchmark corr.', finite(m.benchmark_correlation) ? Number(m.benchmark_correlation).toFixed(2) : '—');
    setMetric(container, 'Upside capture', pct(m.up_capture));
    setMetric(container, 'Downside capture', pct(m.down_capture));
    setMetric(container, 'Daily ES 95%', pct(m.daily_expected_shortfall_95, 2));
    setMetric(container, 'CAPM alpha', pct(m.annualized_alpha));
  }

  function patchAll() {
    patchResearchMetrics();
    patchOverviewFundamentals();
    patchRiskMetrics();
  }

  loadPublicData().then(() => {
    patchAll();
    setTimeout(patchAll, 250);
    setTimeout(patchAll, 1000);
  });

  const observer = new MutationObserver(() => patchAll());
  const start = () => {
    const detail = document.querySelector('#researchDetail');
    if (detail) observer.observe(detail, { childList: true, subtree: true });
    document.querySelector('#researchCompanySelect')?.addEventListener('change', () => setTimeout(patchAll, 0));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  const performanceHelper = document.createElement('script');
  performanceHelper.src = `performance-precision.js?v=${Date.now()}`;
  performanceHelper.async = true;
  document.head.appendChild(performanceHelper);
})();
