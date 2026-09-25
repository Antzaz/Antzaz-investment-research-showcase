(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const finite = v => v !== null && v !== undefined && Number.isFinite(Number(v));
  const pct = (v, d = 1) => finite(v) ? `${(Number(v) * 100).toFixed(d)}%` : '—';
  const num = (v, d = 2) => finite(v) ? Number(v).toFixed(d) : '—';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const metric = (label, value, sub = '') => `<div class="metric"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div>${sub ? `<div class="metric-sub">${esc(sub)}</div>` : ''}</div>`;
  const AI_STATE_KEY = 'antzaz_public_ai_optionality_v3';
  const DEFAULT_SCENARIOS = [
    {name:'AI disappointment', probability:0.15, incrementalReturn:-0.08},
    {name:'Base adoption', probability:0.45, incrementalReturn:0.02},
    {name:'Strong adoption', probability:0.30, incrementalReturn:0.10},
    {name:'AI supercycle', probability:0.10, incrementalReturn:0.22},
  ];

  function ensureStyles() {
    if ($('#advancedResearchStyles')) return;
    const link = document.createElement('link');
    link.id = 'advancedResearchStyles';
    link.rel = 'stylesheet';
    link.href = `advanced-research.css?v=${Date.now()}`;
    document.head.appendChild(link);
  }

  function activateTab(target) {
    $$('.tab[data-target]').forEach(el => el.classList.toggle('active', el.dataset.target === target));
    $$('.panel').forEach(el => el.classList.toggle('active-panel', el.id === target));
    history.replaceState(null, '', `#${target}`);
    setTimeout(() => $$(`#${target} .js-plotly-plot`).forEach(el => window.Plotly?.Plots?.resize(el)), 50);
    const tabs = $('.tabs');
    if (tabs) window.scrollTo({top: tabs.offsetTop, behavior:'smooth'});
  }

  function addTab(id, label) {
    const nav = $('.tabs');
    if (!nav || nav.querySelector(`[data-target="${id}"]`)) return;
    const b = document.createElement('button');
    b.className = 'tab advanced-tab';
    b.dataset.target = id;
    b.textContent = label;
    b.addEventListener('click', () => activateTab(id));
    const philosophy = nav.querySelector('[data-target="philosophy"]');
    philosophy ? nav.insertBefore(b, philosophy) : nav.appendChild(b);
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

  function injectUI() {
    ensureStyles();
    addTab('model-governance', 'ML & Governance');
    addTab('market-expectations', 'Market Expectations');
    addTab('ai-optionality', 'AI Optionality');

    addPanel('model-governance', `
      <article class="card advanced-intro">
        <p class="eyebrow">MODEL RISK & CONTINUAL LEARNING</p>
        <h2>Machine learning earns influence through realized evidence</h2>
        <p class="muted">Forecasts are journaled before outcomes are known. Realized out-of-sample results govern whether ML evidence can influence portfolio expected-return inputs.</p>
        <div class="advanced-callout">Machine learning is used as an additional source of evidence rather than as a black-box replacement for fundamental analysis.</div>
      </article>
      <div class="advanced-horizon-grid">
        <article class="card advanced-horizon"><strong>1M</strong><span>Short-horizon excess-return ensemble</span><small>Journaled for live evaluation · research only</small></article>
        <article class="card advanced-horizon"><strong>3M</strong><span>Short-horizon excess-return ensemble</span><small>Journaled for live evaluation · research only</small></article>
        <article class="card advanced-horizon"><strong>6M</strong><span>Short-horizon excess-return ensemble</span><small>Journaled for live evaluation · research only</small></article>
        <article class="card advanced-horizon"><strong>12M</strong><span>Governed expected-return ensemble</span><small>Only return horizon permitted to influence optimizer inputs</small></article>
      </div>
      <article class="card">
        <p class="eyebrow">LIVE MODEL OUTPUT</p>
        <h2>Current ML forecasts</h2>
        <p class="muted">Latest published model outputs for current portfolio holdings. Return forecasts are expected excess returns versus the benchmark, not absolute price targets.</p>
        <div id="mlLiveMetrics" class="metric-grid compact"></div>
        <div id="mlForecastChart" style="height:430px"></div>
        <div class="table-wrap"><table id="mlForecastTable"></table></div>
        <p id="mlLiveNote" class="footnote"></p>
      </article>
      <article class="card">
        <h2>Implemented ML research stack</h2>
        <div class="governance-grid">
          <div><strong>Expected excess return</strong><span>Histogram Gradient Boosting (65%) + Elastic Net (35%) with expanding walk-forward validation. Separate 1M, 3M, 6M and 12M forward excess-return targets.</span></div>
          <div><strong>Earnings surprise</strong><span>Random Forest regression estimates the next EPS surprise using only information available before the earnings event.</span></div>
          <div><strong>Financial anomaly detection</strong><span>Isolation Forest compares the latest operating profile with the company's own history and surfaces unusual financial patterns for diligence.</span></div>
          <div><strong>Market regime classifier</strong><span>Five-cluster K-Means uses equity, duration, credit, commodity and dollar momentum plus equity volatility as portfolio context.</span></div>
          <div><strong>AI impact ML</strong><span>Company-specific Ridge regression is evidence-gated and refuses to train until sufficient dated KPI history exists.</span></div>
          <div><strong>Portfolio ML / sizing</strong><span>Ledoit-Wolf shrinkage covariance plus a constrained long-only optimizer can use governed 12M ML evidence; it never executes trades.</span></div>
        </div>
      </article>
      <article class="card">
        <h2>Continual-learning governance</h2>
        <p class="muted">Forecasts are stored before outcomes are known, matured only when their forward target becomes observable, and evaluated against contemporaneous simple baselines. Realized error, directional accuracy, skill and drift control model influence through the champion/challenger registry.</p>
        <h2>Governance ladder</h2>
        <div class="governance-grid">
          <div class="governance-card"><span class="status-dot"></span><h3>UNPROVEN</h3><p>Fewer than five matured live forecasts. The supervised model receives only a small influence multiplier while evidence accumulates.</p></div>
          <div class="governance-card"><span class="status-dot challenger"></span><h3>CHALLENGER</h3><p>Enough evidence exists to evaluate the model, but it has not met the stricter champion standard.</p></div>
          <div class="governance-card champion"><span class="status-dot champion"></span><h3>CHAMPION</h3><p>Requires at least 12 matured observations, skill versus baseline ≥ 5%, directional accuracy ≥ 53%, and drift ratio ≤ 1.35 when drift is measurable.</p></div>
          <div class="governance-card demoted"><span class="status-dot demoted"></span><h3>DEMOTED</h3><p>With at least eight observations, sufficiently weak skill, direction or drift can drive portfolio influence to zero.</p></div>
        </div>
      </article>
      <div class="grid two">
        <article class="card"><h2>Controls that matter</h2><div class="advanced-rule-list">
          <div><strong>Realized live evidence</strong><span>Live matured forecasts govern the model registry and portfolio influence.</span></div>
          <div><strong>Purged walk-forward evidence</strong><span>Historical out-of-sample tests provide supporting diagnostics, not a substitute for matured live outcomes.</span></div>
          <div><strong>Baseline comparison</strong><span>Forecast error is compared with a contemporaneous simple baseline rather than judged in isolation.</span></div>
          <div><strong>Drift monitoring</strong><span>Deteriorating recent error relative to prior error can reduce evidence strength or trigger demotion.</span></div>
          <div><strong>Bounded portfolio influence</strong><span>The registry multiplier scales the pre-existing ML blend; final weights remain transparent and constrained.</span></div>
        </div></article>
        <article class="card"><h2>Public evidence boundary</h2><p>The live model registry, prediction journal, training database and realized model-performance rows are intentionally private. This page documents the implemented governance policy without claiming unpublished live ML performance.</p><p class="footnote">No ML model auto-trades, retrains from browser inputs, or overwrites deterministic valuation outputs.</p></article>
      </div>`);

    addPanel('market-expectations', `
      <article class="card advanced-intro">
        <p class="eyebrow">REVERSE DCF</p><h2>What does the current market value already assume?</h2>
        <p class="muted">The public reverse DCF solves for the constant annual free-cash-flow growth rate that makes a simplified corporate FCF model equal the latest public market capitalization.</p>
        <p class="footnote">Public implementation: 10-year explicit period, 9% WACC, 3% terminal growth, current public FCF/cash/debt inputs. Unsolved rows are excluded. The simplified corporate FCF framework is not equally meaningful for financial or insurance-heavy businesses.</p>
      </article>
      <div id="marketExpectationMetrics" class="metric-grid"></div>
      <div class="grid two">
        <article class="card"><div class="section-head"><div><h2>Implied FCF growth</h2><p class="muted">Solved market-implied annual FCF growth rates.</p></div><label class="company-picker">Company<select id="marketExpectationCompany"></select></label></div><div id="marketExpectationChart" class="chart"></div></article>
        <article class="card"><h2>Selected company hurdle</h2><div id="marketExpectationDetail" class="advanced-detail"></div></article>
      </div>
      <article class="card"><h2>Solved reverse-DCF assumptions</h2><div class="table-wrap"><table id="marketExpectationTable"></table></div></article>
      <article class="method-box"><h3>Interpretation</h3><p>This is an expectations diagnostic, not a price target or forecast. It asks what constant FCF-growth path would reconcile the simplified model with the current market capitalization under the stated assumptions.</p></article>`);

    addPanel('ai-optionality', `
      <article class="card advanced-intro">
        <p class="eyebrow">STANDALONE SCENARIO OVERLAY</p><h2>AI Optionality & Uncertainty</h2>
        <p class="muted">A browser-only sensitivity layer using the same transparent overlay formula as the private research module. It does not retrain ML, overwrite published expected returns, or change portfolio weights.</p>
      </article>
      <div class="ai-layout">
        <article class="card ai-controls-card">
          <div class="section-head"><div><h2>Security assumptions</h2><p class="muted">These are user-adjustable scenario assumptions, not measured company facts.</p></div><button id="aiReset" class="text-button" type="button">Reset</button></div>
          <label class="advanced-control">Company<select id="aiCompany"></select></label>
          <label class="advanced-control">AI exposure <output id="aiExposureOut">0.50x</output><input id="aiExposure" type="range" min="0" max="2" value="0.5" step="0.05"></label>
          <label class="advanced-control">Evidence confidence <output id="aiEvidenceOut">50%</output><input id="aiEvidence" type="range" min="0" max="1" value="0.5" step="0.05"></label>
          <label class="advanced-control">AI maturity confidence <output id="aiMaturityOut">50%</output><input id="aiMaturity" type="range" min="0" max="1" value="0.5" step="0.05"></label>
          <label class="advanced-control">AI-overlay skill confidence <output id="aiSkillOut">25%</output><input id="aiSkill" type="range" min="0" max="1" value="0.25" step="0.05"></label>
          <label class="advanced-control">Uncertainty aversion λ <output id="aiAversionOut">0.40</output><input id="aiAversion" type="range" min="0" max="1.5" value="0.4" step="0.05"></label>
        </article>
        <article class="card"><h2>Overlay result</h2><div id="aiResultMetrics" class="metric-grid compact"></div><div id="aiReturnChart" class="chart compact-chart"></div></article>
      </div>
      <article class="card"><div class="section-head"><div><h2>AI scenario distribution</h2><p class="muted">Probabilities are normalized to 100%. Incremental return is the 12-month contribution for AI exposure = 1.0.</p></div></div><div class="table-wrap"><table id="aiScenarioTable"></table></div><div id="aiScenarioWarning" class="advanced-warning" hidden></div><div id="aiScenarioChart" class="chart compact-chart"></div></article>
      <article class="method-box"><h3>Overlay formula</h3><p><strong>Credibility</strong> = evidence × maturity × AI-specific skill. <strong>Raw AI contribution</strong> = exposure × expected AI scenario return. <strong>Uncertainty penalty</strong> = λ × |exposure| × scenario volatility. <strong>Certainty-equivalent AI</strong> = credibility × (raw contribution − uncertainty penalty). <strong>Adjusted research return</strong> = published base-case expected return + certainty-equivalent AI.</p><p>The output is a scenario sensitivity only. It is not written back to the thesis, optimizer or portfolio.</p></article>`);
  }

  function applyOverrides(snapshot, overrides) {
    const map = new Map((overrides?.companies || []).map(x => [x.match_company, x]));
    const merge = row => {
      const o = map.get(row?.company);
      return o ? {...row, company:o.display_company || row.company, expected_annual_return:finite(row.expected_annual_return) ? Number(row.expected_annual_return) : o.expected_annual_return} : row;
    };
    snapshot.holdings = (snapshot.holdings || []).map(merge);
    snapshot.reverse_dcf = (snapshot.reverse_dcf || []).map(merge);
    return snapshot;
  }

  function plot(id, data, layout = {}) {
    const el = $(`#${id}`);
    if (!el || !window.Plotly) return;
    Plotly.react(id, data, {paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{color:'#dbe7f5'},margin:{l:48,r:20,t:20,b:55},...layout}, {responsive:true,displayModeBar:false});
  }

  function renderMarketExpectations(d) {
    const allRows = d.reverse_dcf || [];
    const rows = allRows.filter(r => finite(r.implied_annual_fcf_growth));
    const metricsEl = $('#marketExpectationMetrics');
    const select = $('#marketExpectationCompany');
    const table = $('#marketExpectationTable');
    if (!rows.length) {
      if (metricsEl) metricsEl.innerHTML = metric('Coverage', 'Unavailable', 'No solved public reverse DCF rows');
      if (table) table.innerHTML = '<tbody><tr><td class="muted">No meaningful reverse-DCF solutions are available in the current public snapshot.</td></tr></tbody>';
      return;
    }
    const sorted = [...rows].sort((a,b) => Number(a.implied_annual_fcf_growth) - Number(b.implied_annual_fcf_growth));
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? Number(sorted[mid].implied_annual_fcf_growth) : (Number(sorted[mid-1].implied_annual_fcf_growth) + Number(sorted[mid].implied_annual_fcf_growth)) / 2;
    const mean = sorted.reduce((s,r) => s + Number(r.implied_annual_fcf_growth), 0) / sorted.length;
    metricsEl.innerHTML = [
      ['Solved companies', `${rows.length} / ${allRows.length}`, 'Meaningful public reverse DCF'],
      ['Median implied FCF growth', pct(median), 'Across solved names'],
      ['Average implied FCF growth', pct(mean), 'Across solved names'],
      ['Framework', 'Simplified reverse DCF', '10Y · WACC 9% · terminal 3%']
    ].map(x => metric(...x)).join('');
    select.innerHTML = rows.map((r,i) => `<option value="${i}">${esc(r.company)}</option>`).join('');
    const updateDetail = () => {
      const r = rows[Number(select.value)] || rows[0];
      const holding = (d.holdings || []).find(h => h.company === r.company);
      $('#marketExpectationDetail').innerHTML = `<div class="metric-grid compact">${metric('Implied FCF growth',pct(r.implied_annual_fcf_growth),'Annual hurdle')}${metric('WACC',pct(r.wacc),'Discount rate')}${metric('Terminal growth',pct(r.terminal_growth),'Long-run assumption')}${metric('Forecast period',finite(r.forecast_years)?`${num(r.forecast_years,0)}Y`:'—','Explicit period')}${metric('Published expected return',pct(holding?.expected_annual_return),'Separate thesis assumption')}</div><p class="advanced-note">Published expected return and reverse-DCF implied growth answer different questions: the former is a thesis scenario estimate; the latter is the FCF-growth hurdle implied by this simplified valuation model.</p>`;
    };
    select.addEventListener('change', updateDetail);
    updateDetail();
    table.innerHTML = `<thead><tr><th>Company</th><th>Implied annual FCF growth</th><th>WACC</th><th>Terminal growth</th><th>Forecast years</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.company)}</td><td>${pct(r.implied_annual_fcf_growth)}</td><td>${pct(r.wacc)}</td><td>${pct(r.terminal_growth)}</td><td>${finite(r.forecast_years)?num(r.forecast_years,0):'—'}</td></tr>`).join('')}</tbody>`;
    plot('marketExpectationChart', [{type:'bar',orientation:'h',y:sorted.map(r=>r.company),x:sorted.map(r=>Number(r.implied_annual_fcf_growth)),hovertemplate:'%{y}<br>Implied FCF growth %{x:.1%}<extra></extra>'}], {xaxis:{tickformat:'.0%',title:'Implied annual FCF growth'},margin:{l:220,r:20,t:10,b:50}});
  }

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(AI_STATE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) { return {}; }
  }
  function writeState(state) { try { localStorage.setItem(AI_STATE_KEY, JSON.stringify(state)); } catch (_) {} }

  function renderAI(d) {
    const holdings = (d.holdings || []).filter(h => finite(h.expected_annual_return));
    const select = $('#aiCompany');
    if (!select || !holdings.length) {
      if ($('#aiResultMetrics')) $('#aiResultMetrics').innerHTML = metric('AI overlay','Unavailable','No published base-case expected returns');
      return;
    }
    select.innerHTML = holdings.map((h,i) => `<option value="${i}">${esc(h.company)}</option>`).join('');
    const controls = {exposure:$('#aiExposure'),evidence:$('#aiEvidence'),maturity:$('#aiMaturity'),skill:$('#aiSkill'),aversion:$('#aiAversion')};
    const outputs = {exposure:$('#aiExposureOut'),evidence:$('#aiEvidenceOut'),maturity:$('#aiMaturityOut'),skill:$('#aiSkillOut'),aversion:$('#aiAversionOut')};
    const state = readState();
    let scenarios = Array.isArray(state.scenarios) && state.scenarios.length ? state.scenarios.map(x=>({...x})) : DEFAULT_SCENARIOS.map(x=>({...x}));

    const companyKey = () => holdings[Number(select.value)]?.company || holdings[0].company;
    function loadCompanyState() {
      const saved = state.companies?.[companyKey()] || {};
      controls.exposure.value = finite(saved.exposure) ? saved.exposure : 0.5;
      controls.evidence.value = finite(saved.evidence) ? saved.evidence : 0.5;
      controls.maturity.value = finite(saved.maturity) ? saved.maturity : 0.5;
      controls.skill.value = finite(saved.skill) ? saved.skill : 0.25;
      controls.aversion.value = finite(saved.aversion) ? saved.aversion : 0.4;
    }
    function persist() {
      state.companies ||= {};
      state.companies[companyKey()] = {exposure:Number(controls.exposure.value),evidence:Number(controls.evidence.value),maturity:Number(controls.maturity.value),skill:Number(controls.skill.value),aversion:Number(controls.aversion.value)};
      state.scenarios = scenarios;
      writeState(state);
    }
    function drawScenarioTable() {
      $('#aiScenarioTable').innerHTML = `<thead><tr><th>Scenario</th><th>Probability %</th><th>Incremental return %</th></tr></thead><tbody>${scenarios.map((s,i)=>`<tr><td>${esc(s.name)}</td><td><input class="scenario-input" data-prob="${i}" type="number" min="0" step="1" value="${(Number(s.probability)*100).toFixed(1)}"></td><td><input class="scenario-input" data-ret="${i}" type="number" step="1" value="${(Number(s.incrementalReturn)*100).toFixed(1)}"></td></tr>`).join('')}</tbody>`;
      $$('[data-prob]').forEach(el => el.addEventListener('input', () => { scenarios[Number(el.dataset.prob)].probability = Math.max(0,(Number(el.value)||0)/100); update(); }));
      $$('[data-ret]').forEach(el => el.addEventListener('input', () => { scenarios[Number(el.dataset.ret)].incrementalReturn = (Number(el.value)||0)/100; update(); }));
    }
    function update() {
      const h = holdings[Number(select.value)] || holdings[0];
      const exposure = Math.max(0, Number(controls.exposure.value)||0);
      const evidence = Math.min(1,Math.max(0,Number(controls.evidence.value)||0));
      const maturity = Math.min(1,Math.max(0,Number(controls.maturity.value)||0));
      const skill = Math.min(1,Math.max(0,Number(controls.skill.value)||0));
      const aversion = Math.max(0,Number(controls.aversion.value)||0);
      outputs.exposure.value = `${exposure.toFixed(2)}x`; outputs.evidence.value = `${Math.round(evidence*100)}%`; outputs.maturity.value = `${Math.round(maturity*100)}%`; outputs.skill.value = `${Math.round(skill*100)}%`; outputs.aversion.value = aversion.toFixed(2);
      const totalP = scenarios.reduce((s,x)=>s+Math.max(0,Number(x.probability)||0),0);
      const warning = $('#aiScenarioWarning');
      if (!(totalP > 0)) {
        warning.hidden = false; warning.textContent = 'Scenario probabilities must contain positive total probability mass.';
        $('#aiResultMetrics').innerHTML = metric('Scenario error','Check probabilities');
        return;
      }
      warning.hidden = true;
      const normalized = scenarios.map(x=>({...x,p:Math.max(0,Number(x.probability)||0)/totalP,r:Number(x.incrementalReturn)||0}));
      const mean = normalized.reduce((s,x)=>s+x.p*x.r,0);
      const variance = normalized.reduce((s,x)=>s+x.p*Math.pow(x.r-mean,2),0);
      const sigma = Math.sqrt(Math.max(0,variance));
      const credibility = evidence*maturity*skill;
      const raw = exposure*mean;
      const penalty = aversion*Math.abs(exposure)*sigma;
      const ce = credibility*(raw-penalty);
      const base = Number(h.expected_annual_return);
      const adjusted = base + ce;
      $('#aiResultMetrics').innerHTML = [
        ['Published base return',pct(base),'Existing thesis'],['Scenario mean',pct(mean),'Exposure = 1.0'],['Scenario uncertainty',pct(sigma),'Probability-weighted σ'],['Credibility',pct(credibility),'Evidence × maturity × skill'],['Raw AI contribution',pct(raw),'Before uncertainty haircut'],['Uncertainty penalty',pct(penalty),`λ ${aversion.toFixed(2)}`],['Certainty-equivalent AI',pct(ce),'Standalone overlay'],['Adjusted research return',pct(adjusted),'Sandbox only']
      ].map(x=>metric(...x)).join('');
      plot('aiReturnChart',[{type:'bar',x:['Published base','AI-overlay sensitivity'],y:[base,adjusted],text:[pct(base),pct(adjusted)],textposition:'auto',hovertemplate:'%{x}<br>%{y:.1%}<extra></extra>'}],{yaxis:{tickformat:'.0%',title:'Expected return'},margin:{l:55,r:15,t:10,b:50}});
      plot('aiScenarioChart',[{type:'bar',x:normalized.map(x=>x.name),y:normalized.map(x=>exposure*x.r),customdata:normalized.map(x=>x.p),hovertemplate:'%{x}<br>Exposure shock %{y:+.1%}<br>Normalized probability %{customdata:.1%}<extra></extra>'}],{yaxis:{tickformat:'+.0%',title:'Return shock at selected exposure'},xaxis:{tickangle:-18},margin:{l:60,r:15,t:10,b:85}});
      persist();
    }
    select.addEventListener('change',()=>{loadCompanyState();update();});
    Object.values(controls).forEach(el=>{el.addEventListener('input',update);el.addEventListener('change',update);});
    $('#aiReset').addEventListener('click',()=>{
      if (state.companies) delete state.companies[companyKey()];
      scenarios = DEFAULT_SCENARIOS.map(x=>({...x})); state.scenarios = scenarios; writeState(state);
      loadCompanyState(); drawScenarioTable(); update();
    });
    loadCompanyState(); drawScenarioTable(); update();
  }


  function renderML(d) {
    const ml = d.ml || {};
    const rows = Array.isArray(ml.predictions) ? ml.predictions.filter(r => finite(r.prediction)) : [];
    const metricsEl = $('#mlLiveMetrics'), table = $('#mlForecastTable'), note = $('#mlLiveNote');
    if (!rows.length) {
      if (metricsEl) metricsEl.innerHTML = metric('Live output', ml.status || 'Awaiting data', 'No published ML predictions in the current snapshot');
      if (table) table.innerHTML = '<tbody><tr><td class="muted">The public page will populate automatically after the next successful ML learning run publishes current predictions.</td></tr></tbody>';
      if (note) note.textContent = 'No forecast values are fabricated when the persistent learning store has not produced a valid prediction.';
      return;
    }
    const returnRows = rows.filter(r => /Excess Return/.test(r.model));
    const companies = [...new Set(returnRows.map(r => r.company))];
    const horizons = ['Expected 1M Excess Return','Expected 3M Excess Return','Expected 6M Excess Return','Expected 12M Excess Return'];
    if (metricsEl) metricsEl.innerHTML = [
      ['Companies', String(new Set(rows.map(r=>r.company)).size), 'Current portfolio coverage'],
      ['Forecasts', String(rows.length), 'Latest published outputs'],
      ['As of', ml.as_of || '—', 'Point-in-time model input'],
      ['Benchmark', ml.benchmark || 'SPY', 'Excess-return reference']
    ].map(x=>metric(...x)).join('');
    if (table) table.innerHTML = '<thead><tr><th>Company</th><th>Model</th><th>Prediction</th><th>Confidence</th><th>As of</th></tr></thead><tbody>' +
      rows.map(r=>'<tr><td>'+esc(r.company)+'</td><td>'+esc(r.model.replace('Expected ','').replace(' Excess Return',' excess return'))+'</td><td>'+pct(r.prediction)+'</td><td>'+esc(r.confidence||'—')+'</td><td>'+esc(r.as_of||'—')+'</td></tr>').join('') + '</tbody>';
    if (returnRows.length) {
      const traces = horizons.map(h => ({
        type:'bar', name:h.replace('Expected ','').replace(' Excess Return',''),
        x:companies,
        y:companies.map(company => {
          const r=returnRows.find(x=>x.company===company && x.model===h);
          return r ? Number(r.prediction) : null;
        }),
        hovertemplate:'%{x}<br>%{fullData.name}: %{y:+.1%}<extra></extra>'
      }));
      plot('mlForecastChart', traces, {barmode:'group',yaxis:{tickformat:'+.0%',title:'Expected excess return vs benchmark'},xaxis:{tickangle:-20},margin:{l:65,r:15,t:20,b:120},legend:{orientation:'h'}});
    }
    if (note) note.textContent = 'These are model outputs from the persistent point-in-time learning store. They are research evidence, not investment recommendations or guaranteed returns.';
  }

  async function loadData() {
    const [snapRes, overRes] = await Promise.all([
      fetch(`data/portfolio_snapshot.json?v=${Date.now()}`,{cache:'no-store'}),
      fetch(`data/thesis_overrides.json?v=${Date.now()}`,{cache:'no-store'})
    ]);
    if (!snapRes.ok) throw new Error('portfolio snapshot unavailable');
    const snapshot = await snapRes.json();
    const overrides = overRes.ok ? await overRes.json() : {companies:[]};
    return applyOverrides(snapshot, overrides);
  }

  async function init() {
    injectUI();
    try {
      const d = await loadData();
      renderML(d);
      renderMarketExpectations(d);
      renderAI(d);
    } catch (err) {
      console.error('Advanced research modules failed to load:', err);
      if ($('#marketExpectationMetrics')) $('#marketExpectationMetrics').innerHTML = metric('Data','Unavailable','Please reload after the next successful public refresh');
      if ($('#aiResultMetrics')) $('#aiResultMetrics').innerHTML = metric('Data','Unavailable','Please reload after the next successful public refresh');
    }
    const hash = location.hash.replace('#','');
    if (['model-governance','market-expectations','ai-optionality'].includes(hash)) activateTab(hash);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
