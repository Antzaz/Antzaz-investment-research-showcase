(() => {
  const pct = (v, d = 1) => v == null || !Number.isFinite(Number(v)) ? '—' : `${(Number(v) * 100).toFixed(d)}%`;
  const dateOnly = v => {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v).slice(0, 10) : d.toISOString().slice(0, 10);
  };

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

  function patchFreshness(snapshot) {
    const el = document.querySelector('#freshness');
    if (!el) return false;
    const md = snapshot?.metadata || {};
    const base = md.base_snapshot_generated_utc || snapshot?.generated_utc;
    const refresh = md.public_analytics_generated_utc || md.public_fundamentals_generated_utc;
    const through = md.analysis_end;
    const parts = [];
    if (base) parts.push(`Portfolio-weight snapshot ${dateOnly(base)}`);
    if (refresh) parts.push(`public analytics refreshed ${dateOnly(refresh)}`);
    if (through) parts.push(`market data through ${String(through).slice(0,10)}`);
    if (parts.length) el.textContent = parts.join(' · ');
    return true;
  }

  function patchMethodology(snapshot) {
    const el = document.querySelector('#performanceMethodology');
    if (!el) return false;
    const base = snapshot?.metadata?.performance_basis || 'Current published portfolio weights are applied retrospectively across common adjusted-price history. This is a research model, not transaction-weighted realized client performance.';
    const note = ' The series is a constant-current-weight research backcast: the same published weights are applied to each daily return observation. Annualized return and risk statistics use a 252-observation convention on the common adjusted-price observation set; calendar period returns use actual published series dates.';
    el.textContent = `${base}${base.includes('constant-current-weight') ? '' : note}`;
    return true;
  }

  function patchAttributionLanguage() {
    const chart = document.querySelector('#attributionChart');
    if (!chart) return false;
    const card = chart.closest('.card');
    const h2 = card?.querySelector('h2');
    if (h2) h2.textContent = 'Static weighted-return contribution diagnostic';
    const foot = card?.querySelector('.footnote');
    if (foot) foot.textContent = 'Current weight × daily asset return summed over the common history. This is a non-linked research diagnostic, not additive compounded attribution and not transaction-level realized attribution.';

    const table = document.querySelector('#attributionTable');
    if (table) {
      [...table.querySelectorAll('th')].forEach(th => {
        if (/^Contribution$/i.test(th.textContent.trim())) th.textContent = 'Weighted daily-return sum';
      });
    }
    return true;
  }

  function patchFactorLanguage() {
    const chart = document.querySelector('#factorChart');
    if (!chart) return false;
    const card = chart.closest('.card');
    const h2 = card?.querySelector('h2');
    if (h2) h2.textContent = 'ETF-proxy return sensitivity';
    if (card && !card.querySelector('.proxy-method-note')) {
      const p = document.createElement('p');
      p.className = 'footnote proxy-method-note';
      p.textContent = 'Each value is a separate single-proxy beta to a public ETF return series (for example SPY, IWM, IWD, IWF, MTUM, QUAL or USMV). These are exposure diagnostics, not a multivariate factor-model decomposition.';
      card.appendChild(p);
    }
    return true;
  }

  function patchFundamentalLanguage() {
    const metrics = document.querySelector('#characteristicMetrics');
    if (!metrics) return false;
    [...metrics.querySelectorAll('.metric')].forEach(m => {
      const label = m.querySelector('.label');
      if (label && /^Revenue growth$/i.test(label.textContent.trim())) label.textContent = 'Latest revenue growth';
    });
    const card = metrics.closest('.card');
    const foot = card?.querySelector('.footnote');
    if (foot) foot.textContent = 'Weighted only across holdings with an available public field. Revenue growth, operating margin and ROE use the public provider’s latest reported company fields; reporting periods and update timing can differ by issuer.';
    return true;
  }

  function suppressUnrefreshedAlphaDiagnostics() {
    const table = document.querySelector('#alphaTable');
    if (!table) return false;
    const staleNames = /t\s*-?stat|p\s*-?value|r\s*\^?2|r²/i;
    const headers = [...table.querySelectorAll('thead th')];
    headers.forEach((th, idx) => {
      if (!staleNames.test(th.textContent || '')) return;
      [...table.querySelectorAll('tbody tr')].forEach(tr => {
        if (tr.cells[idx]) tr.cells[idx].textContent = 'N/A';
      });
    });
    [...table.querySelectorAll('tbody tr')].forEach(tr => {
      const label = tr.cells?.[0]?.textContent || '';
      if (staleNames.test(label) && tr.cells?.[1]) tr.cells[1].textContent = 'N/A';
    });
    const card = table.closest('.card');
    const foot = card?.querySelector('.footnote');
    if (foot) foot.textContent = 'Alpha is refreshed from the current public series using a single-market CAPM-style estimate. Legacy t-statistic, p-value and R² fields are intentionally suppressed until they are recomputed from the same refreshed sample.';
    return true;
  }

  function patchAdvancedScope(snapshot) {
    const heading = document.querySelector('#market-expectations .advanced-intro h2');
    if (!heading) return false;
    heading.textContent = 'What does the latest public market snapshot imply?';
    const intro = document.querySelector('#market-expectations .advanced-intro');
    const md = snapshot?.metadata || {};
    let asof = intro.querySelector('.market-snapshot-asof');
    if (!asof) {
      asof = document.createElement('p');
      asof.className = 'footnote market-snapshot-asof';
      intro.appendChild(asof);
    }
    asof.textContent = `Inputs reflect the latest successful public refresh${md.public_analytics_generated_utc ? ` (${dateOnly(md.public_analytics_generated_utc)})` : ''}${md.analysis_end ? `; market-price history through ${String(md.analysis_end).slice(0,10)}` : ''}. The model uses public market-cap, FCF, cash and debt fields available at refresh time.`;

    const holdings = snapshot?.holdings || [];
    const limited = new Set(holdings.filter(h => /financial|bank|insurance/i.test(`${h.sector || ''} ${h.industry || ''}`)).map(h => h.company));
    const table = document.querySelector('#marketExpectationTable');
    if (table) {
      [...table.querySelectorAll('tbody tr')].forEach(tr => {
        const cell = tr.cells?.[0];
        if (cell && limited.has(cell.textContent.trim()) && !/scope-limited/i.test(cell.textContent)) cell.textContent += ' — scope-limited';
      });
    }
    const select = document.querySelector('#marketExpectationCompany');
    if (select) {
      [...select.options].forEach(o => {
        const raw = o.textContent.replace(/\s+— scope-limited$/,'');
        if (limited.has(raw) && !/scope-limited/i.test(o.textContent)) o.textContent = `${raw} — scope-limited`;
      });
      const detail = document.querySelector('#marketExpectationDetail');
      const warn = () => {
        if (!detail) return;
        let note = detail.querySelector('.financial-scope-note');
        const name = select.options[select.selectedIndex]?.textContent.replace(/\s+— scope-limited$/,'') || '';
        if (limited.has(name)) {
          if (!note) { note = document.createElement('p'); note.className = 'advanced-warning financial-scope-note'; detail.appendChild(note); }
          note.textContent = 'Scope-limited: a simplified corporate free-cash-flow reverse DCF is not directly comparable for bank or insurance-heavy business models. Treat this result as a mechanical diagnostic only.';
          note.hidden = false;
        } else if (note) note.hidden = true;
      };
      if (!select.dataset.scopeListener) { select.addEventListener('change', () => setTimeout(warn, 0)); select.dataset.scopeListener = '1'; }
      setTimeout(warn, 0);
    }
    return true;
  }

  async function run() {
    const snapshot = await fetchSnapshot();
    if (!snapshot) return;
    patchFreshness(snapshot);
    patchMethodology(snapshot);

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      const done = [
        patchAnnualizedRow(snapshot),
        patchFreshness(snapshot),
        patchMethodology(snapshot),
        patchAttributionLanguage(),
        patchFactorLanguage(),
        patchFundamentalLanguage(),
        suppressUnrefreshedAlphaDiagnostics(),
        patchAdvancedScope(snapshot),
      ].every(Boolean);
      if (done || attempts >= 60) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true}); else run();
})();
