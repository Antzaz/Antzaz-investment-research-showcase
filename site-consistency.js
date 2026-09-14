(() => {
  const pct = (v, d = 1) => v == null || !Number.isFinite(Number(v)) ? '—' : `${(Number(v) * 100).toFixed(d)}%`;

  async function fetchSnapshot() {
    try {
      const res = await fetch(`data/portfolio_snapshot.json?v=${Date.now()}`, {cache:'no-store'});
      return res.ok ? await res.json() : null;
    } catch (_) { return null; }
  }

  function patchAnnualizedRow(snapshot) {
    const m = snapshot?.metrics || {};
    const table = document.querySelector('#performanceTable');
    if (!table || m.annualized_return == null) return false;
    const row = [...table.querySelectorAll('tbody tr')].find(tr => /Since analysis start/i.test(tr.cells?.[0]?.textContent || ''));
    if (!row || row.cells.length < 4) return false;
    row.cells[0].innerHTML = 'Since analysis start <span class="annualized">252-observation annualized</span>';
    row.cells[1].textContent = pct(m.annualized_return);
    row.cells[2].textContent = pct(m.benchmark_annualized_return);
    row.cells[3].textContent = pct(m.active_annualized_return);
    const active = Number(m.active_annualized_return);
    row.cells[3].className = Number.isFinite(active) ? (active >= 0 ? 'positive' : 'negative') : '';
    return true;
  }

  function patchMethodology(snapshot) {
    const el = document.querySelector('#performanceMethodology');
    if (!el) return;
    const base = snapshot?.metadata?.performance_basis || 'Current published portfolio weights are applied retrospectively across common adjusted-price history. This is a research model, not transaction-weighted realized client performance.';
    const note = ' Annualized return and risk statistics use a 252-observation convention on the common adjusted-price observation set; calendar period returns use actual published series dates.';
    if (!el.textContent.includes('252-observation')) el.textContent = `${base}${note}`;
  }

  async function run() {
    const snapshot = await fetchSnapshot();
    if (!snapshot) return;
    patchMethodology(snapshot);
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (patchAnnualizedRow(snapshot) || attempts >= 40) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true}); else run();
})();
