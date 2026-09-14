(() => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'pre-release.css?v=1';
  document.head.appendChild(css);

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const pct = (v, d = 1) => v == null || !Number.isFinite(+v) ? '—' : `${(+v * 100).toFixed(d)}%`;
  const num = (v, d = 2) => v == null || !Number.isFinite(+v) ? '—' : (+v).toFixed(d);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const metric = (label, value, sub = '') => `<div class="metric"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div>${sub ? `<div class="metric-sub">${esc(sub)}</div>` : ''}</div>`;
  const REVIEW_KEY = 'antzaz_pre_release_review_v1';

  function activatePreviewTab(target) {
    $$('.tab[data-target]').forEach(x => x.classList.toggle('active', x.dataset.target === target));
    $$('.panel').forEach(x => x.classList.toggle('active-panel', x.id === target));
    history.replaceState(null, '', `#${target}`);
    setTimeout(() => $$(`#${target} .js-plotly-plot`).forEach(el => window.Plotly?.Plots?.resize(el)), 30);
    const tabs = $('.tabs');
    if (tabs) window.scrollTo({ top: tabs.offsetTop, behavior: 'smooth' });
  }

  function addTab(id, label, before = 'philosophy') {
    const nav = $('.tabs');
    if (!nav || nav.querySelector(`[data-target="${id}"]`)) return;
    const b = document.createElement('button');
    b.className = 'tab pre-release-tab';
    b.dataset.target = id;
    b.textContent = label;
    b.addEventListener('click', () => activatePreviewTab(id));
    const ref = nav.querySelector(`[data-target="${before}"]`);
    ref ? nav.insertBefore(b, ref) : nav.appendChild(b);
  }

  function addPanel(id, html) {
    if ($(`#${id}`)) return;
    const panel = document.createElement('section');
    panel.id = id;
    panel.className = 'panel pre-release-only';
    panel.innerHTML = html;
    const philosophy = $('#philosophy');
    philosophy ? philosophy.parentNode.insertBefore(panel, philosophy) : $('main')?.appendChild(panel);
  }

  function injectShell() {
    document.body.insertAdjacentHTML('afterbegin', '<div class="staging-ribbon">PRIVATE PRE-RELEASE <small>not live</small></div>');

    const hero = $('.hero > div');
    if (hero) hero.insertAdjacentHTML('beforeend', `
      <article class="preview-banner preview-hero-card">
        <span class="preview-kicker">Private staging environment</span>
        <strong>Candidate public-site features are tested here first.</strong>
        <span class="muted">Nothing in this branch is promoted to the live showcase until you explicitly approve it in Release Review.</span>
        <blockquote>Machine learning is used as an additional source of evidence rather than as a black-box replacement for fundamental analysis.</blockquote>
      </article>`);

    addTab('optimization', 'Portfolio Optimization');
    addTab('model-governance', 'ML & Governance');
    addTab('market-expectations', 'Market Expectations');
    addTab('ai-optionality', 'AI Optionality');
    addTab('release-review', 'Release Review');

    addPanel('optimization', `
      <article class="card">
        <p class="eyebrow">PORTFOLIO CONSTRUCTION PREVIEW</p>
        <h2>Classical + machine-learning-assisted optimization</h2>
        <p class="muted">A recruiter-facing view of the private optimizer. Numerical optimized allocations remain withheld until a sanitized optimizer snapshot is explicitly published.</p>
        <div id="previewOptimizerMetrics" class="metric-grid"></div>
      </article>
      <article class="card">
        <h2>Strategy suite</h2>
        <div id="previewStrategyGrid" class="preview-strategy-grid"></div>
      </article>
      <div class="grid two">
        <article class="card"><h2>Current vs equal weight</h2><div id="previewEqualWeightChart" class="chart"></div><p class="footnote">Equal weight is shown as a neutral public comparison. Private optimizer target weights are not inferred or fabricated.</p></article>
        <article class="card"><h2>What the private engine does</h2><div id="previewOptimizerMethod" class="preview-card-grid"></div></article>
      </div>
      <article class="card"><h2>Efficient frontier</h2><div class="preview-empty">UI reserved for sanitized optimizer output. The private engine already calculates constrained classical and ML-assisted frontiers; this staging site will only publish them once the exported data contract is reviewed.</div></article>`);

    addPanel('model-governance', `
      <article class="card">
        <p class="eyebrow">MODEL RISK & CONTINUAL LEARNING</p>
        <h2>ML evidence earns influence</h2>
        <p class="muted">Forecasts are journaled before outcomes are known, evaluated out-of-sample, and promoted or demoted by explicit governance rules.</p>
        <div class="horizon-grid">
          <div class="horizon-card"><strong>1M</strong><span>Excess-return research signal · faster feedback · no optimizer influence</span></div>
          <div class="horizon-card"><strong>3M</strong><span>Excess-return research signal · research only</span></div>
          <div class="horizon-card"><strong>6M</strong><span>Excess-return research signal · research only</span></div>
          <div class="horizon-card"><strong>12M</strong><span>Governed expected-return input · only horizon allowed to affect optimizer</span></div>
        </div>
      </article>
      <article class="card"><h2>Governance ladder</h2><div class="governance-ladder">
        <div class="governance-stage"><h3>UNPROVEN</h3><p>Fewer than 5 live matured forecasts. Influence remains heavily capped.</p></div>
        <div class="governance-stage"><h3>CHALLENGER</h3><p>Some realized evidence exists, but the model has not yet met champion requirements.</p></div>
        <div class="governance-stage champion"><h3>CHAMPION</h3><p>Requires at least 12 matured observations, ≥5% baseline skill, ≥53% directional accuracy and acceptable drift.</p></div>
        <div class="governance-stage demoted"><h3>DEMOTED</h3><p>Weak or unstable evidence drives portfolio influence to zero until performance recovers.</p></div>
      </div></article>
      <div class="grid two">
        <article class="card"><h2>Governance principles</h2><div class="preview-card-grid">
          <div class="preview-card"><h3>Walk-forward first</h3><p>No in-sample score is treated as proof of live skill.</p><span class="tag live">OOS evidence</span></div>
          <div class="preview-card"><h3>Baseline comparison</h3><p>Forecast error is judged against simple reference models, not in isolation.</p><span class="tag">Skill hurdle</span></div>
          <div class="preview-card"><h3>Drift monitoring</h3><p>Feature and prediction drift can reduce confidence even when recent accuracy looks acceptable.</p><span class="tag">Risk control</span></div>
          <div class="preview-card"><h3>Bounded influence</h3><p>ML modifies evidence inputs; it never replaces the transparent optimizer or auto-trades.</p><span class="tag private">No auto-trading</span></div>
        </div></article>
        <article class="card"><h2>Live-output boundary</h2><div class="preview-empty">The private model registry, forecast journal and realized-error history are intentionally not copied into the public snapshot yet. This page demonstrates the governance architecture without inventing performance.</div></article>
      </div>`);

    addPanel('market-expectations', `
      <article class="card">
        <p class="eyebrow">REVERSE DCF</p><h2>What does the market price already assume?</h2>
        <p class="muted">Market-implied free-cash-flow growth is presented next to the valuation assumptions used to solve for it.</p>
        <div class="table-wrap"><table id="previewExpectationsTable" class="expectations-table"></table></div>
      </article>
      <article class="method-box"><h3>Interpretation</h3><p>Reverse DCF is an expectations framework, not a target-price generator. It asks which operating trajectory is embedded in the current market price and then compares that hurdle with the fundamental research case.</p></article>`);

    addPanel('ai-optionality', `
      <article class="card">
        <p class="eyebrow">SCENARIO OVERLAY</p><h2>AI Optionality</h2>
        <p class="muted">A separate research overlay for testing how AI-related upside or downside could change the investment narrative. It does not mutate portfolio weights or the deterministic valuation engine.</p>
        <div class="ai-sandbox">
          <div class="ai-controls">
            <label>Company<select id="previewAiCompany"></select></label>
            <label>Research sensitivity assumption <strong id="previewAiSensitivityLabel">0%</strong><input id="previewAiSensitivity" type="range" min="-30" max="30" step="5" value="0"></label>
            <label>Evidence confidence<select id="previewAiConfidence"><option>Low</option><option selected>Medium</option><option>High</option></select></label>
          </div>
          <div class="ai-output" id="previewAiOutput"></div>
        </div>
      </article>
      <article class="card"><h2>Public-facing guardrails</h2><div class="preview-card-grid">
        <div class="preview-card"><h3>Evidence required</h3><p>No AI sensitivity is shown as fact without dated company-specific evidence.</p></div>
        <div class="preview-card"><h3>Scenario, not forecast</h3><p>User assumptions remain visibly separate from fundamental base-case estimates.</p></div>
        <div class="preview-card"><h3>No portfolio mutation</h3><p>The overlay cannot silently change expected returns, optimizer constraints or weights.</p></div>
      </div></article>`);

    addPanel('release-review', `
      <article class="card">
        <p class="eyebrow">PRIVATE RELEASE GATE</p><h2>Decide what reaches the real public site</h2>
        <p class="muted">Your decisions are stored only in this browser. “Promote” does not publish anything automatically; it simply records your preference for the next promotion step.</p>
        <div id="previewReviewSummary" class="review-summary"></div>
        <div id="previewReleaseGrid" class="release-review-grid"></div>
      </article>
      <article class="card"><h2>Release notes</h2><textarea id="previewReleaseNotes" class="preview-notes" placeholder="What should change before this reaches the live public site?"></textarea><p class="private-preview-footer">Stored in localStorage on this device only.</p></article>`);
  }

  function renderOptimizer(d) {
    const h = d.holdings || [];
    const m = d.metrics || {};
    const validExpected = h.filter(x => x.expected_annual_return != null && x.weight != null);
    const weightSum = validExpected.reduce((s, x) => s + (+x.weight || 0), 0);
    const expected = weightSum ? validExpected.reduce((s, x) => s + (+x.weight || 0) * (+x.expected_annual_return || 0), 0) / weightSum : null;
    $('#previewOptimizerMetrics').innerHTML = [
      ['Current expected return', pct(expected), 'Published base cases'],
      ['Current volatility', pct(m.annualized_volatility), 'Historical research model'],
      ['Current Sharpe', num(m.sharpe), 'Research series'],
      ['Effective holdings', num(m.effective_number_of_holdings, 1), 'Concentration diagnostic'],
      ['Tracking error', pct(m.tracking_error), 'vs S&P 500'],
      ['Largest risk share', pct(m.largest_risk_contribution), 'Current portfolio']
    ].map(x => metric(...x)).join('');

    const strategies = [
      ['Current Portfolio', 'Published weights', 'live'],
      ['Equal Weight', 'Neutral comparison', 'live'],
      ['Minimum Variance', 'Long-only constrained optimizer', 'private'],
      ['Maximum Sharpe', 'Classical expected-return optimizer', 'private'],
      ['Mean-Variance', 'Risk-return utility optimizer', 'private'],
      ['ML Maximum Sharpe', 'Confidence-shrunk 12M ML expected returns', 'private'],
      ['ML Mean-Variance', 'ML expected returns + transparent constraints', 'private'],
      ['Regime-Aware ML Maximum Sharpe', 'Bounded conditional covariance overlay', 'private']
    ];
    $('#previewStrategyGrid').innerHTML = strategies.map(([name, desc, status]) => `<div class="preview-strategy"><strong>${esc(name)}</strong><span>${esc(desc)}</span><div><span class="tag ${status === 'live' ? 'live' : 'private'}">${status === 'live' ? 'Public data' : 'Private engine'}</span></div></div>`).join('');

    if (window.Plotly && h.length) {
      const sorted = [...h].sort((a,b) => (+b.weight||0)-(+a.weight||0));
      const ew = 1 / sorted.length;
      Plotly.newPlot('previewEqualWeightChart', [
        { type:'bar', name:'Current', x:sorted.map(x => x.company), y:sorted.map(x => +x.weight||0) },
        { type:'bar', name:'Equal weight', x:sorted.map(x => x.company), y:sorted.map(() => ew) }
      ], { paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)', font:{color:'#dbe7f5'}, barmode:'group', margin:{l:50,r:10,t:20,b:120}, yaxis:{tickformat:'.0%'}, xaxis:{tickangle:-35} }, {responsive:true,displayModeBar:false});
    }

    $('#previewOptimizerMethod').innerHTML = [
      ['Risk estimation', 'Maximum-history pairwise covariance, diagonal shrinkage, PSD repair and Ledoit–Wolf blending.'],
      ['Expected returns', 'Multi-horizon historical prior, optional manual research estimates and confidence-shrunk ML evidence.'],
      ['Regime-aware risk', 'Conditional covariance can influence risk estimates, but long-run covariance remains the majority weight.'],
      ['Constraints', 'Long-only, fully invested, with position, sector and turnover limits.']
    ].map(([t,p]) => `<div class="preview-card"><h3>${t}</h3><p>${p}</p></div>`).join('');
  }

  function renderExpectations(d) {
    const rows = d.reverse_dcf || [];
    const table = $('#previewExpectationsTable');
    if (!table) return;
    if (!rows.length) {
      table.innerHTML = '<tbody><tr><td class="muted">Reverse-DCF outputs are not available in this snapshot.</td></tr></tbody>';
      return;
    }
    table.innerHTML = `<thead><tr><th>Company</th><th>Implied annual FCF growth</th><th>WACC</th><th>Terminal growth</th><th>Forecast years</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.company)}</td><td>${pct(r.implied_annual_fcf_growth)}</td><td>${pct(r.wacc)}</td><td>${pct(r.terminal_growth)}</td><td>${r.forecast_years == null ? '—' : esc(r.forecast_years)}</td></tr>`).join('')}</tbody>`;
  }

  function renderAi(d) {
    const h = d.holdings || [];
    const select = $('#previewAiCompany');
    if (!select) return;
    select.innerHTML = h.map((x,i) => `<option value="${i}">${esc(x.company)}</option>`).join('');
    const slider = $('#previewAiSensitivity');
    const confidence = $('#previewAiConfidence');
    const label = $('#previewAiSensitivityLabel');
    const output = $('#previewAiOutput');
    const update = () => {
      const x = h[+select.value] || {};
      const s = +slider.value || 0;
      label.textContent = `${s > 0 ? '+' : ''}${s}%`;
      output.innerHTML = `<span class="preview-kicker">Scenario sandbox</span><div class="big">${esc(x.company || 'Select a company')}</div><div class="preview-decision"><span class="pill">Assumption ${s > 0 ? '+' : ''}${s}%</span><span class="pill">Confidence ${esc(confidence.value)}</span><span class="pill">Base expected return ${pct(x.expected_annual_return)}</span></div><p class="preview-section-note">This assumption is not applied to the published expected return or portfolio weights. It is a staging control for deciding how an evidence-backed AI optionality module should look publicly.</p>`;
    };
    [select, slider, confidence].forEach(el => el.addEventListener('input', update));
    update();
  }

  function injectFeaturedResearch(d) {
    const research = $('#research');
    if (!research || $('#previewFeaturedResearch')) return;
    const h = [...(d.holdings || [])].sort((a,b) => (+b.weight||0)-(+a.weight||0)).slice(0, 6);
    const box = document.createElement('article');
    box.id = 'previewFeaturedResearch';
    box.className = 'card pre-release-only';
    box.innerHTML = `<p class="eyebrow">FEATURED RESEARCH PREVIEW</p><h2>Selected underwriting cases</h2><p class="muted">A shorter recruiter-facing entry point into the full research library.</p><div class="featured-research-strip">${h.map(x => `<button class="featured-research-button" data-featured-company="${esc(x.company)}"><strong>${esc(x.company)}</strong><small>${esc(x.sector || '')} · Weight ${pct(x.weight)}</small></button>`).join('')}</div>`;
    research.insertBefore(box, research.firstChild);
    $$('[data-featured-company]', box).forEach(btn => btn.addEventListener('click', () => {
      const sel = $('#researchCompanySelect');
      if (!sel) return;
      const option = [...sel.options].find(o => o.textContent === btn.dataset.featuredCompany);
      if (option) { sel.value = option.value; sel.dispatchEvent(new Event('change')); }
    }));
  }

  function injectMethodologyFlow() {
    const p = $('#philosophy');
    if (!p || $('#previewResearchFlow')) return;
    const card = document.createElement('article');
    card.id = 'previewResearchFlow';
    card.className = 'card pre-release-only';
    card.innerHTML = `<p class="eyebrow">RESEARCH PROCESS</p><h2>From security selection to governed portfolio evidence</h2><div class="preview-flow">${['Screening','Fundamental analysis','Valuation','Market expectations','Risk analysis','ML evidence','Portfolio construction'].map(x => `<div class="preview-flow-step">${x}</div>`).join('')}</div><p class="preview-section-note">The public narrative emphasizes investment judgment first; automation and machine learning support the process rather than replace it.</p>`;
    p.insertBefore(card, p.firstChild);
  }

  function renderReview() {
    const modules = [
      ['optimizer','Portfolio Optimization','Strategy suite, methodology and future sanitized frontier output'],
      ['ml','ML & Model Governance','Forecast horizons, promotion ladder and bounded portfolio influence'],
      ['expectations','Market Expectations','Reverse-DCF expectations table and interpretation'],
      ['ai','AI Optionality','Evidence-bounded scenario overlay'],
      ['featured','Featured Research','Short recruiter-facing research archive entry point'],
      ['methodology','Research Process','End-to-end investment decision flow'],
      ['homepage','Homepage positioning','Recruiter-facing positioning and ML philosophy statement']
    ];
    let state = {};
    try { state = JSON.parse(localStorage.getItem(REVIEW_KEY) || '{}'); } catch (_) {}
    const grid = $('#previewReleaseGrid');
    const notes = $('#previewReleaseNotes');
    if (!grid || !notes) return;
    notes.value = state.notes || '';

    const save = () => {
      state.notes = notes.value;
      localStorage.setItem(REVIEW_KEY, JSON.stringify(state));
      summary();
    };
    const draw = () => {
      grid.innerHTML = modules.map(([id,name,desc]) => {
        const choice = state[id] || 'undecided';
        return `<div class="release-review-item" data-review-id="${id}"><header><h3>${name}</h3><span class="tag ${choice === 'promote' ? 'live' : choice === 'hold' ? 'private' : ''}">${choice}</span></header><p>${desc}</p><div class="review-actions"><button data-choice="promote" class="${choice === 'promote' ? 'active-promote' : ''}">Promote</button><button data-choice="hold" class="${choice === 'hold' ? 'active-hold' : ''}">Hold</button><button data-choice="undecided">Reset</button></div></div>`;
      }).join('');
      $$('.release-review-item').forEach(item => $$('[data-choice]', item).forEach(btn => btn.addEventListener('click', () => {
        state[item.dataset.reviewId] = btn.dataset.choice;
        localStorage.setItem(REVIEW_KEY, JSON.stringify(state));
        draw();
        summary();
      })));
    };
    const summary = () => {
      const values = modules.map(([id]) => state[id] || 'undecided');
      const counts = ['promote','hold','undecided'].map(k => [k, values.filter(v => v === k).length]);
      $('#previewReviewSummary').innerHTML = counts.map(([k,v]) => `<span><strong>${v}</strong> ${k}</span>`).join('');
    };
    notes.addEventListener('input', save);
    draw();
    summary();
  }

  async function loadData() {
    const res = await fetch(`data/portfolio_snapshot.json?v=${Date.now()}`, {cache:'no-store'});
    if (!res.ok) throw new Error('portfolio snapshot unavailable');
    return res.json();
  }

  async function init() {
    injectShell();
    injectMethodologyFlow();
    renderReview();
    try {
      const d = await loadData();
      renderOptimizer(d);
      renderExpectations(d);
      renderAi(d);
      injectFeaturedResearch(d);
    } catch (err) {
      console.warn('Pre-release data load failed:', err?.message || err);
      ['previewOptimizerMetrics','previewExpectationsTable'].forEach(id => { const el = $(`#${id}`); if (el) el.innerHTML = '<div class="preview-empty">Staging data unavailable.</div>'; });
    }
    const hash = location.hash.replace('#','');
    if (['optimization','model-governance','market-expectations','ai-optionality','release-review'].includes(hash)) activatePreviewTab(hash);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
