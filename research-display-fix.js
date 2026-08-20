(() => {
  let fundamentals = null;

  async function loadFundamentals() {
    try {
      const response = await fetch(`data/public_fundamentals.json?v=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) fundamentals = await response.json();
    } catch (_) {
      fundamentals = null;
    }
  }

  function findFundamental(company) {
    if (!fundamentals) return null;
    return (fundamentals.companies || []).find(row =>
      row.company === company || (row.aliases || []).includes(company)
    ) || null;
  }

  function patchResearchMetrics() {
    const select = document.querySelector('#researchCompanySelect');
    const detail = document.querySelector('#researchDetail');
    if (!select || !detail || select.selectedIndex < 0) return;
    const company = select.options[select.selectedIndex]?.textContent?.trim();
    const row = findFundamental(company);
    if (!row) return;

    for (const metric of detail.querySelectorAll('.research-metrics .metric')) {
      const label = metric.querySelector('.label')?.textContent?.trim();
      const value = metric.querySelector('.value');
      if (!value) continue;
      if (label === 'Reverse-DCF FCF growth' && value.textContent.trim() === '—') {
        const status = row.reverse_dcf?.status || '';
        if (status && status !== 'Solved') {
          value.textContent = 'N/M';
          const sub = metric.querySelector('.metric-sub');
          if (sub) sub.textContent = 'Not meaningful / insufficient FCF data';
          else {
            const note = document.createElement('div');
            note.className = 'metric-sub';
            note.textContent = 'Not meaningful / insufficient FCF data';
            metric.appendChild(note);
          }
        }
      }
    }
  }

  loadFundamentals().then(patchResearchMetrics);
  const observer = new MutationObserver(() => patchResearchMetrics());
  const start = () => {
    const detail = document.querySelector('#researchDetail');
    if (detail) observer.observe(detail, { childList: true, subtree: true });
    document.querySelector('#researchCompanySelect')?.addEventListener('change', () => setTimeout(patchResearchMetrics, 0));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  const performanceHelper = document.createElement('script');
  performanceHelper.src = `performance-precision.js?v=${Date.now()}`;
  performanceHelper.async = true;
  document.head.appendChild(performanceHelper);
})();
