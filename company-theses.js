const $ = s => document.querySelector(s);
const pct = (x,d=1) => x == null || Number.isNaN(+x) ? '—' : `${(+x*100).toFixed(d)}%`;
const num = (x,d=1) => x == null || Number.isNaN(+x) ? '—' : (+x).toFixed(d);
const esc = v => String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const metric = (label,value,sub='') => `<div class="metric"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div>${sub?`<div class="metric-sub">${esc(sub)}</div>`:''}</div>`;
const fieldCard = (title,value,kind='') => value ? `<article class="card thesis-block thesis-section ${kind}"><h2>${esc(title)}</h2><p>${esc(value)}</p></article>` : '';
function plot(id,data,layout={}){Plotly.newPlot(id,data,{paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{color:'#dbe7f5'},margin:{l:52,r:20,t:18,b:70},...layout},{responsive:true,displayModeBar:false});}

function applyOverrides(snapshot, overrides){
  const map = new Map((overrides?.companies||[]).map(x=>[x.match_company,x]));
  const merge = x => {
    const o = map.get(x.company);
    return o ? {...x, company:o.display_company||x.company, expected_annual_return:x.expected_annual_return ?? o.expected_annual_return} : x;
  };
  snapshot.holdings = (snapshot.holdings||[]).map(merge);
  snapshot.theses = (snapshot.theses||[]).map(merge);
  return snapshot;
}

function scoreLabel(k){return ({business_quality:'Business quality',moat_score:'Moat',management_capital_allocation:'Management / capital allocation',balance_sheet:'Balance sheet',growth:'Growth',valuation:'Valuation',risk_resilience:'Risk / resilience'})[k] || k.replaceAll('_',' ');}

function renderOverview(items){
  const sorted=[...items].sort((a,b)=>(b.expected_annual_return||0)-(a.expected_annual_return||0));
  plot('returnOverviewChart',
    [{type:'bar',orientation:'h',y:sorted.map(x=>x.company),x:sorted.map(x=>x.expected_annual_return),text:sorted.map(x=>pct(x.expected_annual_return)),textposition:'outside',hovertemplate:'%{y}<br>Expected return: %{x:.1%}<extra></extra>'}],
    {xaxis:{tickformat:'.0%',title:'Base-case annualized expected return'},yaxis:{automargin:true,autorange:'reversed'},margin:{l:210,r:70,t:10,b:55}}
  );
}

function renderCompany(item){
  if(!item)return;
  $('#companyHeader').innerHTML=`
    <div class="company-title-row">
      <div><p class="eyebrow">${esc(item.sector||'PORTFOLIO HOLDING')}</p><h2>${esc(item.company)}</h2><p class="muted">${esc(item.status||'Active')} · ${esc(item.time_horizon||'Long term')}</p></div>
      <div class="return-pill"><span>Base-case expected return</span><strong>${pct(item.expected_annual_return)}</strong><small>annualized scenario estimate</small></div>
    </div>
    <div class="metric-grid compact company-metrics">
      ${metric('Portfolio weight',pct(item.weight))}
      ${metric('Expected return',pct(item.expected_annual_return),'Base case')}
      ${metric('Conviction',item.conviction==null?'—':`${num(item.conviction,1)} / 5`)}
      ${metric('Research score',item.composite_score==null?'—':`${num(item.composite_score,2)} / 5`)}
      ${metric('Time horizon',item.time_horizon||'—')}
    </div>`;

  const scores=item.scores||{};
  const keys=Object.keys(scores);
  if(keys.length){
    plot('companyScoreChart',[{type:'bar',x:keys.map(scoreLabel),y:keys.map(k=>scores[k]),text:keys.map(k=>num(scores[k],1)),textposition:'outside',hovertemplate:'%{x}: %{y:.1f}/5<extra></extra>'}],{yaxis:{range:[0,5.4],dtick:1},xaxis:{tickangle:-20},margin:{l:45,r:20,t:10,b:110}});
  } else { $('#companyScoreChart').innerHTML='<p class="muted">No scorecard published.</p>'; }

  $('#decisionFrame').innerHTML=`
    <div class="decision-item"><span>Why it is owned</span><p>${esc(item.why_owned||'—')}</p></div>
    <div class="decision-item"><span>What changes the mind</span><p>${esc(item.sell_condition||'—')}</p></div>
    <div class="decision-item"><span>What is monitored</span><p>${esc(item.monitoring_kpi||'—')}</p></div>`;

  $('#companyThesisBody').innerHTML=[
    fieldCard('Investment Thesis',item.investment_thesis,'thesis-primary'),
    fieldCard('Competitive Advantage / Moat',item.competitive_advantage),
    fieldCard('Growth Drivers',item.growth_drivers),
    fieldCard('Valuation Rationale',item.valuation_rationale,'valuation-card'),
    fieldCard('Catalysts',item.catalysts),
    fieldCard('Key Risks',item.key_risks,'risk-card'),
    fieldCard('Falsification / Sell Condition',item.sell_condition,'risk-card'),
    fieldCard('Monitoring KPIs',item.monitoring_kpi),
    fieldCard('Research Notes',item.public_notes)
  ].join('');
}

async function init(){
  try{
    const [snapRes,overRes]=await Promise.all([
      fetch(`data/portfolio_snapshot.json?v=${Date.now()}`,{cache:'no-store'}),
      fetch(`data/thesis_overrides.json?v=${Date.now()}`,{cache:'no-store'})
    ]);
    if(!snapRes.ok)throw new Error('portfolio snapshot unavailable');
    const snapshot=await snapRes.json();
    const overrides=overRes.ok?await overRes.json():{companies:[]};
    const data=applyOverrides(snapshot,overrides);
    const items=(data.theses||[]).filter(x=>x.company);
    $('#thesisFreshness').textContent=`Portfolio analytics: ${data.generated_utc||'available'} · Expected-return fallback: ${overrides.generated_utc||'available'}`;
    if(!items.length)throw new Error('no company theses published');
    renderOverview(items);
    const sel=$('#thesisCompanySelect');
    sel.innerHTML=items.map((x,i)=>`<option value="${i}">${esc(x.company)}</option>`).join('');
    const params=new URLSearchParams(location.search);
    const requested=(params.get('company')||'').toLowerCase();
    const initial=requested?Math.max(0,items.findIndex(x=>x.company.toLowerCase().includes(requested))):0;
    sel.value=String(initial);
    renderCompany(items[initial]);
    sel.addEventListener('change',()=>renderCompany(items[+sel.value]));
  }catch(err){
    $('#thesisFreshness').textContent='Company thesis data is temporarily unavailable.';
    $('.thesis-page-shell').insertAdjacentHTML('afterbegin','<article class="card"><h2>Data temporarily unavailable</h2><p>Please reload after the next successful portfolio refresh.</p></article>');
  }
}
init();
