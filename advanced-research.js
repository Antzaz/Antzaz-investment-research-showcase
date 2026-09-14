(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const pct = (v, d = 1) => v == null || !Number.isFinite(+v) ? '—' : `${(+v * 100).toFixed(d)}%`;
  const num = (v, d = 2) => v == null || !Number.isFinite(+v) ? '—' : (+v).toFixed(d);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const metric = (label, value, sub = '') => `<div class="metric"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div>${sub ? `<div class="metric-sub">${esc(sub)}</div>` : ''}</div>`;
  const AI_STATE_KEY = 'antzaz_public_ai_optionality_v2';

  const DEFAULT_SCENARIOS = [
    {name:'AI disappointment', probability:0.15, incrementalReturn:-0.08},
    {name:'Base adoption', probability:0.45, incrementalReturn:0.02},
    {name:'Strong adoption', probability:0.30, incrementalReturn:0.10},
    {name:'AI supercycle', probability:0.10, incrementalReturn:0.22},
  ];

  function addStyles() {
    if ($('#advancedResearchStyles')) return;
    const link = document.createElement('link');
    link.id = 'advancedResearchStyles';
    link.rel = 'stylesheet';
    link.href = 'advanced-research.css';
    document.head.appendChild(link);
  }

  function activateTab(target) {
    $$('.tab[data-target]').forEach(x => x.classList.toggle('active', x.dataset.target === target));
    $$('.panel').forEach(x => x.classList.toggle('active-panel', x.id === target));
    history.replaceState(null, '', `#${target}`);
    setTimeout(() => $$(`#${target} .js-plotly-plot`).forEach(el => window.Plotly?.Plots?.resize(el)), 40);
    const tabs = $('.tabs');
    if (tabs) window.scrollTo({top: tabs.offsetTop, behavior: 'smooth'});
  }

  function addTab(id, label) {
    const nav = $('.tabs');
    if (!nav || nav.querySelector(`[data-target="${id}"]`)) return;
    const button = document.createElement('button');
    button.className = 'tab advanced-tab';
    button.dataset.target = id;
    button.textContent = label;
    button.addEventListener('click', () => activateTab(id));
    const philosophy = nav.querySelector('[data-target="philosophy"]');
    philosophy ? nav.insertBefore(button, philosophy) : nav.appendChild(button);
  }

  function addPanel(id, html) {
    if ($(`#${id}`)) return;
    const panel = document.createElement('section');
    panel.id = id;
    panel.className = 'panel';
    panel.innerHTML = html;
    const philosophy = $('#philosophy');
    philosophy ? philosophy.parentNode.insertBefore(panel, philosophy) : $('main')?.appendChild(panel);
  }

  function injectShell() {
    addStyles();
    addTab('model-governance', 'ML & Governance');
    addTab('market-expectations', 'Market Expectations');
    addTab('ai-optionality', 'AI Optionality');

    addPanel('model-governance', `
      <article class="card advanced-intro">
        <p class="eyebrow">MODEL RISK & CONTINUAL LEARNING</p>
        <h2>Machine learning earns influence through realized evidence</h2>
        <p class="muted">The private research system journals forecasts before outcomes are known, scores them out-of-sample and governs whether they are allowed to influence portfolio construction.</p>
        <div class="advanced-callout">Machine learning is used as an additional source of evidence rather than as a black-box replacement for fundamental analysis.</div>
      </article>
      <div class="advanced-horizon-grid">
        <article class="card advanced-horizon"><strong>1M</strong><span>Separate excess-return model</span><small>Fast feedback · research only</small></article>
        <article class="card advanced-horizon"><strong>3M</strong><span>Separate excess-return model</span><small>Research only</small></article>
        <article class="card advanced-horizon"><strong>6M</strong><span>Separate excess-return model</span><small>Research only</small></article>
        <article class="card advanced-horizon"><strong>12M</strong><span>Governed expected-return model</span><small>Only ML horizon permitted to influence optimizer inputs</small></article>
      </div>
      <article class="card">
        <h2>Governance ladder</h2>
        <div class="governance-grid">
          <div class="governance-card"><span class="status-dot"></span><h3>UNPROVEN</h3><p>Fewer than five live matured forecasts. Influence remains heavily capped while evidence accumulates.</p></div>
          <div class="governance-card"><span class="status-dot challenger"></span><h3>CHALLENGER</h3><p>Some realized evidence exists, but the model has not yet met the stricter champion standard.</p></div>
          <div class="governance-card champion"><span class="status-dot champion"></span><h3>CHAMPION</h3><p>Requires at least 12 matured observations, at least 5% baseline skill, at least 53% directional accuracy and acceptable drift.</p></div>
          <div class="governance-card demoted"><span class="status-dot demoted"></span><h3>DEMOTED</h3><p>Weak or unstable evidence drives portfolio influence to zero until the model earns its way back.</p></div>
        </div>
      </article>
      <div class="grid two">
        <article class="card"><h2>Controls that matter</h2><div class="advanced-rule-list">
          <div><strong>Walk-forward evidence</strong><span>Live or purged out-of-sample results matter more than in-sample fit.</span></div>
          <div><strong>Baseline skill</strong><span>Forecast error is compared with simple reference models.</span></div>
          <div><strong>Drift monitoring</strong><span>Unstable feature or prediction behaviour can reduce confidence.</span></div>
          <div><strong>Bounded portfolio influence</strong><span>ML supplies evidence inputs; final weights remain transparent and constrained.</span></div>
        </div></article>
        <article class="card"><h2>Public evidence boundary</h2><p>The live model registry, raw prediction journal and private training database are not published here. This page documents the real governance architecture without inventing live ML performance.</p><p class="footnote">No model can auto-trade or silently overwrite the deterministic valuation and portfolio-construction process.</p></article>
      </div>`);

    addPanel('market-expectations', `
      <article class="card advanced-intro">
        <p class="eyebrow">REVERSE DCF</p><h2>What does the current share price already assume?</h2>
        <p class="muted">Reverse DCF reframes valuation as an expectations problem: instead of asking for a target price first, it solves for the operating trajectory embedded in the market price.</p>
      </article>
      <div id="marketExpectationMetrics" class="metric-grid"></div>
      <div class="grid two">
        <article class="card"><div class="section-head"><div><h2>Implied FCF growth</h2><p class="muted">Market-implied annual free-cash-flow growth by covered company.</p></div><label class="company-picker">Company<select id="marketExpectationCompany"></select></label></div><div id="marketExpectationChart" class="chart"></div></article>
        <article class="card"><h2>Selected company hurdle</h2><div id="marketExpectationDetail" class="advanced-detail"></div></article>
      </div>
      <article class="card"><h2>Reverse-DCF assumptions</h2><div class="table-wrap"><table id="marketExpectationTable"></table></div></article>
      <article class="method-box"><h3>How to interpret it</h3><p>Reverse DCF is not a price target. It identifies the growth assumptions required to justify the current market value under the published discount-rate and terminal-growth assumptions. That hurdle can then be compared with the fundamental thesis.</p></article>`);

    addPanel('ai-optionality', `
      <article class="card advanced-intro">
        <p class="eyebrow">STANDALONE SCENARIO OVERLAY</p><h2>AI Optionality & Uncertainty</h2>
        <p class="muted">An interactive sensitivity layer built from the same transparent formula as the private research module. It does not retrain ML, overwrite the published expected return or change portfolio weights.</p>
      </article>
      <div class="ai-layout">
        <article class="card ai-controls-card">
          <div class="section-head"><div><h2>Security assumptions</h2><p class="muted">All controls below are analyst scenario inputs, not measured facts.</p></div><button id="aiReset" class="text-button" type="button">Reset</button></div>
          <label class="advanced-control">Company<select id="aiCompany"></select></label>
          <label class="advanced-control">AI exposure <output id="aiExposureOut">0.50x</output><input id="aiExposure" type="range" min="0" max="2" value="0.5" step="0.05"></label>
          <label class="advanced-control">Evidence confidence <output id="aiEvidenceOut">50%</output><input id="aiEvidence" type="range" min="0" max="1" value="0.5" step="0.05"></label>
          <label class="advanced-control">AI maturity confidence <output id="aiMaturityOut">50%</output><input id="aiMaturity" type="range" min="0" max="1" value="0.5" step="0.05"></label>
          <label class="advanced-control">AI-overlay skill confidence <output id="aiSkillOut">25%</output><input id="aiSkill" type="range" min="0" max="1" value="0.25" step="0.05"></label>
          <label class="advanced-control">Uncertainty aversion λ <output id="aiAversionOut">0.40</output><input id="aiAversion" type="range" min="0" max="1.5" value="0.4" step="0.05"></label>
        </article>
        <article class="card"><h2>Overlay result</h2><div id="aiResultMetrics" class="metric-grid compact"></div><div id="aiReturnChart" class="chart compact-chart"></div></article>
      </div>
      <article class="card">
        <div class="section-head"><div><h2>AI scenario distribution</h2><p class="muted">Probabilities are automatically normalized to 100%. Incremental return is the 12-month contribution for AI exposure = 1.0.</p></div></div>
        <div class="table-wrap"><table id="aiScenarioTable"></table></div>
        <div id="aiScenarioWarning" class="advanced-warning" hidden></div>
        <div id="aiScenarioChart" class="chart compact-chart"></div>
      </article>
      <article class="method-box"><h3>Overlay formula</h3><p><strong>Credibility</strong> = evidence × maturity × AI-specific skill. <strong>Raw AI contribution</strong> = exposure × expected AI scenario return. <strong>Uncertainty penalty</strong> = λ × |exposure| × scenario volatility. <strong>Certainty-equivalent AI</strong> = credibility × (raw contribution − uncertainty penalty). The adjusted research return equals the existing published base-case return plus that certainty-equivalent contribution.</p><p>This is deliberately a sensitivity tool: it never changes the actual portfolio, optimizer inputs or public thesis assumptions.</p></article>`);
  }

  function applyOverrides(snapshot, overrides) {
    const map = new Map((overrides?.companies || []).map(x => [x.match_company, x]));
    const merge = x => {
      const o = map.get(x.company);
      return o ? {...x, company:o.display_company || x.company, expected_annual_return:x.expected_annual_return ?? o.expected_annual_return} : x;
    };
    snapshot.holdings = (snapshot.holdings || []).map(merge);
    snapshot.reverse_dcf = (snapshot.reverse_dcf || []).map(merge);
    return snapshot;
  }

  function plot(id, data, layout = {}) {
    const el = $(`#${id}`);
    if (!el || !window.Plotly) return;
    Plotly.react(id, data, {paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)', font:{color:'#dbe7f5'}, margin:{l:48,r:20,t:20,b:55}, ...layout}, {responsive:true,displayModeBar:false});
  }

  function renderGovernance() {
    // Architecture-only by design. Dynamic private registry values are intentionally not public.
  }

  function renderMarketExpectations(d) {
    const rows = (d.reverse_dcf || []).filter(r => Number.isFinite(+r.implied_annual_fcf_growth));
    const select = $('#marketExpectationCompany');
    const table = $('#marketExpectationTable');
    if (!rows.length) {
      $('#marketExpectationMetrics').innerHTML = metric('Coverage', 'Unavailable', 'Reverse-DCF snapshot');
      if (table) table.innerHTML = '<tbody><tr><td class="muted">Reverse-DCF outputs are unavailable in the current public snapshot.</td></tr></tbody>';
      return;
    }
    const mean = rows.reduce((s,r) => s + (+r.implied_annual_fcf_growth), 0) / rows.length;
    const sorted = [...rows].sort((a,b) => (+a.implied_annual_fcf_growth) - (+b.implied_annual_fcf_growth));
    $('#marketExpectationMetrics').innerHTML = [
      ['Companies covered', String(rows.length), 'Public reverse DCF'],
      ['Median implied FCF growth', pct(sorted[Math.floor(sorted.length/2)]?.implied_annual_fcf_growth), 'Market hurdle'],
      ['Average implied FCF growth', pct(mean), 'Across covered names'],
      ['Framework', 'Reverse DCF', 'Expectations, not target price']
    ].map(x => metric(...x)).join('');
    select.innerHTML = rows.map((r,i) => `<option value="${i}">${esc(r.company)}</option>`).join('');
    const updateDetail = () => {
      const r = rows[+select.value] || rows[0];
      const holding = (d.holdings || []).find(h => h.company === r.company);
      $('#marketExpectationDetail').innerHTML = `
        <div class="metric-grid compact">
          ${metric('Implied FCF growth', pct(r.implied_annual_fcf_growth), 'Annual hurdle')}
          ${metric('WACC', pct(r.wacc), 'Discount rate')}
          ${metric('Terminal growth', pct(r.terminal_growth), 'Long-run assumption')}
          ${metric('Forecast period', r.forecast_years == null ? '—' : `${esc(r.forecast_years)}Y`, 'Explicit period')}
          ${metric('Published expected return', pct(holding?.expected_annual_return), 'Separate base-case thesis')}
        </div>
        <p class="advanced-note">The published expected return and reverse-DCF implied growth answer different questions. The former is the research base case; the latter is the operating hurdle embedded in the current price.</p>`;
    };
    select.addEventListener('change', updateDetail);
    updateDetail();
    table.innerHTML = `<thead><tr><th>Company</th><th>Implied annual FCF growth</th><th>WACC</th><th>Terminal growth</th><th>Forecast years</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.company)}</td><td>${pct(r.implied_annual_fcf_growth)}</td><td>${pct(r.wacc)}</td><td>${pct(r.terminal_growth)}</td><td>${r.forecast_years == null ? '—' : esc(r.forecast_years)}</td></tr>`).join('')}</tbody>`;
    const chartRows = [...rows].sort((a,b) => (+a.implied_annual_fcf_growth) - (+b.implied_annual_fcf_growth));
    plot('marketExpectationChart', [{type:'bar', orientation:'h', y:chartRows.map(r => r.company), x:chartRows.map(r => +r.implied_annual_fcf_growth), hovertemplate:'%{y}<br>Implied FCF growth %{x:.1%}<extra></extra>'}], {xaxis:{tickformat:'.0%',title:'Implied annual FCF growth'}, margin:{l:220,r:20,t:10,b:50}});
  }

  function safeStoredState() {
    try { return JSON.parse(localStorage.getItem(AI_STATE_KEY) || '{}'); } catch (_) { return {}; }
  }

  function renderAI(d) {
    const holdings = (d.holdings || []).filter(h => Number.isFinite(+h.expected_annual_return));
    const select = $('#aiCompany');
    if (!holdings.length || !select) {
      $('#aiResultMetrics').innerHTML = metric('AI overlay', 'Unavailable', 'No published base-case expected returns');
      return;
    }
    select.innerHTML = holdings.map((h,i) => `<option value="${i}">${esc(h.company)}</option>`).join('');

    const controls = {
      exposure: $('#aiExposure'), evidence: $('#aiEvidence'), maturity: $('#aiMaturity'),
      skill: $('#aiSkill'), aversion: $('#aiAversion')
    };
    const outputs = {
      exposure: $('#aiExposureOut'), evidence: $('#aiEvidenceOut'), maturity: $('#aiMaturityOut'),
      skill: $('#aiSkillOut'), aversion: $('#aiAversionOut')
    };
    const state = safeStoredState();
    let scenarios = Array.isArray(state.scenarios) && state.scenarios.length ? state.scenarios : DEFAULT_SCENARIOS.map(x => ({...x}));

    function companyKey() { return holdings[+select.value]?.company || holdings[0].company; }
    function loadCompanyState() {
      const saved = state.companies?.[companyKey()] || {};
      controls.exposure.value = saved.exposure ?? 0.5;
      controls.evidence.value = saved.evidence ?? 0.5;
      controls.maturity.value = saved.maturity ?? 0.5;
      controls.skill.value = saved.skill ?? 0.25;
      controls.aversion.value = saved.aversion ?? 0.4;
    }
    function saveState() {
      state.companies ||= {};
      state.companies[companyKey()] = {
        exposure:+controls.exposure.value, evidence:+controls.evidence.value,
        maturity:+controls.maturity.value, skill:+controls.skill.value, aversion:+controls.aversion.value
      };
      state.scenarios = scenarios;
      localStorage.setItem(AI_STATE_KEY, JSON.stringify(state));
    }
    function drawScenarioTable() {
      $('#aiScenarioTable').innerHTML = `<thead><tr><th>Scenario</th><th>Probability %</th><th>Incremental return %</th></tr></thead><tbody>${scenarios.map((s,i) => `<tr><td>${esc(s.name)}</td><td><input class="scenario-input" data-scenario-prob="${i}" type="number" min="0" step="1" value="${(+s.probability*100).toFixed(1)}"></td><td><input class="scenario-input" data-scenario-return="${i}" type="number" step="1" value="${(+s.incrementalReturn*100).toFixed(1)}"></td></tr>`).join('')}</tbody>`;
      $$('[data-scenario-prob]').forEach(el => el.addEventListener('input', () => { scenarios[+el.dataset.scenarioProb].probability = Math.max(0, (+el.value || 0) / 100); update(); }));
      $$('[data-scenario-return]').forEach(el => el.addEventListener('input', () => { scenarios[+el.dataset.scenarioReturn].incrementalReturn = (+el.value || 0) / 100; update(); }));
    }
    function update() {
      const h = holdings[+select.value] || holdings[0];
      const exposure = +controls.exposure.value || 0;
      const evidence = Math.min(1, Math.max(0, +controls.evidence.value || 0));
      const maturity = Math.min(1, Math.max(0, +controls.maturity.value || 0));
      const skill = Math.min(1, Math.max(0, +controls.skill.value || 0));
      const aversion = Math.max(0, +controls.aversion.value || 0);
      outputs.exposure.value = `${exposure.toFixed(2)}x`;
      outputs.evidence.value = `${Math.round(evidence*100)}%`;
      outputs.maturity.value = `${Math.round(maturity*100)}%`;
      outputs.skill.value = `${Math.round(skill*100)}%`;
      outputs.aversion.value = aversion.toFixed(2);

      const totalP = scenarios.reduce((s,x) => s + Math.max(0,+x.probability||0), 0);
      const warning = $('#aiScenarioWarning');
      if (!(totalP > 0)) {
        warning.hidden = false;
        warning.textContent = 'Scenario probabilities must contain positive total probability mass.';
        $('#aiResultMetrics').innerHTML = metric('Scenario error', 'Check probabilities');
        return;
      }
      warning.hidden = true;
      const normalized = scenarios.map(x => ({...x, p:Math.max(0,+x.probability||0)/totalP, r:+x.incrementalReturn||0}));
      const mean = normalized.reduce((s,x) => s + x.p*x.r, 0);
      const variance = normalized.reduce((s,x) => s + x.p*Math.pow(x.r-mean,2), 0);
      const sigma = Math.sqrt(Math.max(0, variance));
      const credibility = evidence*maturity*skill;
      const raw = exposure*mean;
      const penalty = aversion*Math.abs(exposure)*sigma;
      const ce = credibility*(raw-penalty);
      const base = +h.expected_annual_return;
      const adjusted = base + ce;

      $('#aiResultMetrics').innerHTML = [
        ['Published base return', pct(base), 'Existing thesis'],
        ['Scenario mean', pct(mean), 'Exposure = 1.0'],
        ['Scenario uncertainty', pct(sigma), 'Probability-weighted σ'],
        ['Credibility', pct(credibility), 'Evidence × maturity × skill'],
        ['Raw AI contribution', pct(raw), 'Before uncertainty haircut'],
        ['Uncertainty penalty', pct(penalty), `λ ${aversion.toFixed(2)}`],
        ['Certainty-equivalent AI', pct(ce), 'Standalone overlay'],
        ['Adjusted research return', pct(adjusted), 'Sandbox only']
      ].map(x => metric(...x)).join('');

      plot('aiReturnChart', [{type:'bar', x:['Published base','AI-overlay sensitivity'], y:[base,adjusted], text:[pct(base),pct(adjusted)], textposition:'auto', hovertemplate:'%{x}<br>%{y:.1%}<extra></extra>'}], {yaxis:{tickformat:'.0%',title:'Expected return'}, margin:{l:55,r:15,t:10,b:50}});
      plot('aiScenarioChart', [{type:'bar', x:normalized.map(x => x.name), y:normalized.map(x => exposure*x.r), customdata:normalized.map(x => x.p), hovertemplate:'%{x}<br>Exposure shock %{y:+.1%}<br>Normalized probability %{customdata:.1%}<extra></extra>'}], {yaxis:{tickformat:'+.0%',title:'Return shock at selected exposure'}, xaxis:{tickangle:-18}, margin:{l:60,r:15,t:10,b:85}});
      saveState();
    }

    select.addEventListener('change', () => { loadCompanyState(); update(); });
    Object.values(controls).forEach(el => { el.addEventListener('input', update); el.addEventListener('change', update); });
    $('#aiReset').addEventListener('click', () => {
      if (state.companies) delete state.companies[companyKey()];
      scenarios = DEFAULT_SCENARIOS.map(x => ({...x}));
      state.scenarios = scenarios;
      localStorage.setItem(AI_STATE_KEY, JSON.stringify(state));
      loadCompanyState();
      drawScenarioTable();
      update();
    });
    loadCompanyState();
    drawScenarioTable();
    update();
  }

  async function loadData() {
    const [snapRes, overRes] = await Promise.all([
      fetch(`data/portfolio_snapshot.json?v=${Date.now()}`, {cache:'no-store'}),
      fetch(`data/thesis_overrides.json?v=${Date.now()}`, {cache:'no-store'})
    ]);
    if (!snapRes.ok) throw new Error('portfolio snapshot unavailable');
    const snapshot = await snapRes.json();
    const overrides = overRes.ok ? await overRes.json() : {companies:[]};
    return applyOverrides(snapshot, overrides);
  }

  async function init() {
    injectShell();
    renderGovernance();
    try {
      const d = await loadData();
      renderMarketExpectations(d);
      renderAI(d);
    } catch (err) {
      console.error('Advanced research modules failed to load:', err);
      const exp = $('#marketExpectationMetrics');
      const ai = $('#aiResultMetrics');
      if (exp) exp.innerHTML = metric('Data', 'Unavailable', 'Please reload after the next public refresh');
      if (ai) ai.innerHTML = metric('Data', 'Unavailable', 'Please reload after the next public refresh');
    }
    const hash = location.hash.replace('#','');
    if (['model-governance','market-expectations','ai-optionality'].includes(hash)) activateTab(hash);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();