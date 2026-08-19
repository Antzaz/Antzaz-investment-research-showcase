const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const pct=(x,d=1)=>x==null||Number.isNaN(+x)?'—':`${(+x*100).toFixed(d)}%`;const num=(x,d=2)=>x==null||Number.isNaN(+x)?'—':(+x).toFixed(d);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const metric=(label,value,sub='')=>`<div class="metric"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div>${sub?`<div class="metric-sub">${esc(sub)}</div>`:''}</div>`;
const fieldCard=(title,value,kind='')=>value?`<article class="card thesis-block thesis-section ${kind}"><h2>${esc(title)}</h2><p>${esc(value)}</p></article>`:'';
let thesisItems=[];

function activateTab(target){
  $$('.tab[data-target]').forEach(x=>x.classList.toggle('active',x.dataset.target===target));
  $$('.panel').forEach(x=>x.classList.toggle('active-panel',x.id===target));
  if(target==='theses'){
    setTimeout(()=>$$('#theses .js-plotly-plot').forEach(el=>Plotly.Plots.resize(el)),30);
  }
  window.scrollTo({top:document.querySelector('.tabs').offsetTop,behavior:'smooth'});
}

$$('.tab[data-target]').forEach(b=>b.addEventListener('click',()=>activateTab(b.dataset.target)));
$$('[data-open-tab]').forEach(b=>b.addEventListener('click',()=>activateTab(b.dataset.openTab)));

function plot(id,data,layout={}){Plotly.newPlot(id,data,{paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{color:'#dbe7f5'},margin:{l:48,r:20,t:20,b:55},...layout},{responsive:true,displayModeBar:false});}

function applyOverrides(snapshot,overrides){
  const map=new Map((overrides?.companies||[]).map(x=>[x.match_company,x]));
  const merge=x=>{const o=map.get(x.company);return o?{...x,company:o.display_company||x.company,expected_annual_return:x.expected_annual_return??o.expected_annual_return}:x};
  snapshot.holdings=(snapshot.holdings||[]).map(merge);
  snapshot.theses=(snapshot.theses||[]).map(merge);
  return snapshot;
}

function renderMetrics(m,holdings){
  const eligible=holdings.filter(x=>x.expected_annual_return!=null&&x.weight!=null);
  const weightSum=eligible.reduce((s,x)=>s+(+x.weight||0),0);
  const weighted=weightSum?eligible.reduce((s,x)=>s+(+x.weight||0)*(+x.expected_annual_return||0),0)/weightSum:null;
  $('#metrics').innerHTML=[['Ann. return',pct(m.annualized_return)],['Ann. volatility',pct(m.annualized_volatility)],['Sharpe',num(m.sharpe)],['Tracking error',pct(m.tracking_error)],['Info ratio',num(m.information_ratio)],['Max drawdown',pct(m.max_drawdown)],['Beta',num(m.beta)],['Sortino',num(m.sortino)],['Active return',pct(m.active_annualized_return)],['Weighted expected return',pct(weighted)],['Daily ES 95%',pct(m.daily_expected_shortfall_95,2)]].map(x=>metric(...x)).join('');
}

function renderHoldings(h){
  const names=h.map(x=>x.company),weights=h.map(x=>+x.weight||0),risk=h.map(x=>+x.risk_contribution||0);
  plot('weightsChart',[{type:'pie',labels:names,values:weights,hole:.45,textinfo:'label+percent'}],{showlegend:false});
  plot('riskChart',[{type:'bar',name:'Weight',x:names,y:weights},{type:'bar',name:'Risk contribution',x:names,y:risk}],{barmode:'group',yaxis:{tickformat:'.0%'}});
  const sec={};h.forEach(x=>{if(x.sector)sec[x.sector]=(sec[x.sector]||0)+(+x.weight||0)});
  plot('sectorChart',[{type:'bar',x:Object.keys(sec),y:Object.values(sec)}],{yaxis:{tickformat:'.0%'}});
  $('#holdingsTable').innerHTML=`<thead><tr><th>Company</th><th>Sector</th><th>Weight</th><th>Expected return</th><th>Risk contribution</th></tr></thead><tbody>${h.map(x=>`<tr><td><button class="table-link company-jump" data-company="${esc(x.company)}">${esc(x.company||'—')}</button></td><td>${esc(x.sector||'—')}</td><td>${pct(x.weight)}</td><td>${pct(x.expected_annual_return)}</td><td>${pct(x.risk_contribution)}</td></tr>`).join('')}</tbody>`;
  $$('.company-jump').forEach(b=>b.addEventListener('click',()=>openCompanyThesis(b.dataset.company)));
}

function renderGrowth(ts){if(!ts?.length)return;plot('growthChart',[{type:'scatter',mode:'lines',name:'Portfolio',x:ts.map(x=>x.date),y:ts.map(x=>x.portfolio_growth)},{type:'scatter',mode:'lines',name:'Benchmark',x:ts.map(x=>x.date),y:ts.map(x=>x.benchmark_growth)}]);}
function renderRisk(d){if(d.factors?.length)plot('factorChart',[{type:'bar',x:d.factors.map(x=>x.factor),y:d.factors.map(x=>x.exposure)}]);if(d.stress?.length)plot('stressChart',[{type:'bar',x:d.stress.map(x=>x.scenario),y:d.stress.map(x=>x.estimated_return)}],{yaxis:{tickformat:'.0%'}});}

function renderPhilosophy(p){
  if(!p||!Object.keys(p).length){$('#philosophyCard').innerHTML='<h2>Portfolio philosophy</h2><p class="muted">No public philosophy text has been published yet.</p>';return;}
  const fields=[['Investment Philosophy','investment_philosophy'],['Portfolio Objective','portfolio_objective'],['Research Process','research_process'],['Selection Criteria','selection_criteria'],['Position Sizing','position_sizing'],['Diversification','diversification'],['Risk Management','risk_management'],['Sell Discipline','sell_discipline'],['Monitoring & Review','monitoring_and_review'],['Portfolio Edge','portfolio_edge'],['What I Avoid','what_i_avoid'],['Closing Summary','closing_summary']];
  $('#philosophyCard').innerHTML=`<h2>Portfolio Philosophy</h2><div class="metric-grid compact">${metric('Benchmark',p.benchmark||'—')}${metric('Time horizon',p.time_horizon||'—')}${metric('Return objective',p.return_objective||'—')}</div><div class="thesis-grid">${fields.filter(x=>p[x[1]]).map(([t,k])=>`<div class="thesis-block"><h3>${esc(t)}</h3><p>${esc(p[k])}</p></div>`).join('')}</div>`;
}

function scoreLabel(k){return ({business_quality:'Business quality',moat_score:'Moat',management_capital_allocation:'Management / capital allocation',balance_sheet:'Balance sheet',growth:'Growth',valuation:'Valuation',risk_resilience:'Risk / resilience'})[k]||k.replaceAll('_',' ');}

function renderThesisOverview(items){
  const sorted=[...items].filter(x=>x.expected_annual_return!=null).sort((a,b)=>b.expected_annual_return-a.expected_annual_return);
  if(!sorted.length){$('#returnOverviewChart').innerHTML='<p class="muted">Expected-return assumptions are not available yet.</p>';return;}
  plot('returnOverviewChart',[{type:'bar',orientation:'h',y:sorted.map(x=>x.company),x:sorted.map(x=>x.expected_annual_return),text:sorted.map(x=>pct(x.expected_annual_return)),textposition:'outside',hovertemplate:'%{y}<br>Expected return: %{x:.1%}<extra></extra>'}],{xaxis:{tickformat:'.0%',title:'Base-case annualized expected return'},yaxis:{automargin:true,autorange:'reversed'},margin:{l:220,r:70,t:10,b:55}});
}

function renderCompanyThesis(item){
  if(!item)return;
  $('#companyHeader').innerHTML=`<div class="company-title-row"><div><p class="eyebrow">${esc(item.sector||'PORTFOLIO HOLDING')}</p><h2>${esc(item.company)}</h2><p class="muted">${esc(item.status||'Active')} · ${esc(item.time_horizon||'Long term')}</p></div><div class="return-pill"><span>Base-case expected return</span><strong>${pct(item.expected_annual_return)}</strong><small>annualized scenario estimate</small></div></div><div class="metric-grid compact company-metrics">${metric('Portfolio weight',pct(item.weight))}${metric('Expected return',pct(item.expected_annual_return),'Base case')}${metric('Conviction',item.conviction==null?'—':`${num(item.conviction,1)} / 5`)}${metric('Research score',item.composite_score==null?'—':`${num(item.composite_score,2)} / 5`)}${metric('Time horizon',item.time_horizon||'—')}</div>`;
  const scores=item.scores||{};const keys=Object.keys(scores);
  if(keys.length){plot('companyScoreChart',[{type:'bar',x:keys.map(scoreLabel),y:keys.map(k=>scores[k]),text:keys.map(k=>num(scores[k],1)),textposition:'outside',hovertemplate:'%{x}: %{y:.1f}/5<extra></extra>'}],{yaxis:{range:[0,5.4],dtick:1},xaxis:{tickangle:-20},margin:{l:45,r:20,t:10,b:110}});}else{$('#companyScoreChart').innerHTML='<p class="muted">No scorecard published.</p>';}
  $('#decisionFrame').innerHTML=`<div class="decision-item"><span>Why it is owned</span><p>${esc(item.why_owned||'—')}</p></div><div class="decision-item"><span>What changes the mind</span><p>${esc(item.sell_condition||'—')}</p></div><div class="decision-item"><span>What is monitored</span><p>${esc(item.monitoring_kpi||'—')}</p></div>`;
  $('#companyThesisBody').innerHTML=[fieldCard('Investment Thesis',item.investment_thesis,'thesis-primary'),fieldCard('Competitive Advantage / Moat',item.competitive_advantage),fieldCard('Growth Drivers',item.growth_drivers),fieldCard('Valuation Rationale',item.valuation_rationale,'valuation-card'),fieldCard('Catalysts',item.catalysts),fieldCard('Key Risks',item.key_risks,'risk-card'),fieldCard('Falsification / Sell Condition',item.sell_condition,'risk-card'),fieldCard('Monitoring KPIs',item.monitoring_kpi),fieldCard('Research Notes',item.public_notes)].join('');
}

function renderTheses(items){
  thesisItems=items.filter(x=>x.company);
  const sel=$('#thesisCompanySelect');
  sel.innerHTML=thesisItems.map((x,i)=>`<option value="${i}">${esc(x.company)}</option>`).join('');
  renderThesisOverview(thesisItems);
  if(thesisItems.length)renderCompanyThesis(thesisItems[0]);
  sel.addEventListener('change',()=>renderCompanyThesis(thesisItems[+sel.value]));
}

function openCompanyThesis(company){
  if(!thesisItems.length)return;
  const idx=thesisItems.findIndex(x=>x.company===company||x.company.toLowerCase().includes(String(company).toLowerCase()));
  const safeIdx=idx>=0?idx:0;
  $('#thesisCompanySelect').value=String(safeIdx);
  renderCompanyThesis(thesisItems[safeIdx]);
  activateTab('theses');
}

async function init(){
  try{
    const [snapRes,overRes]=await Promise.all([fetch(`data/portfolio_snapshot.json?v=${Date.now()}`,{cache:'no-store'}),fetch(`data/thesis_overrides.json?v=${Date.now()}`,{cache:'no-store'})]);
    if(!snapRes.ok)throw new Error('snapshot unavailable');
    const snapshot=await snapRes.json();const overrides=overRes.ok?await overRes.json():{companies:[]};const d=applyOverrides(snapshot,overrides);
    $('#freshness').textContent=`Portfolio analytics: ${d.generated_utc||'available'} · Expected-return assumptions: ${overrides.generated_utc||d.generated_utc||'available'}`;
    renderMetrics(d.metrics||{},d.holdings||[]);renderHoldings(d.holdings||[]);renderGrowth(d.timeseries||[]);renderRisk(d);renderPhilosophy(d.portfolio_philosophy||{});renderTheses(d.theses||[]);
    const hash=location.hash.replace('#','');if(['portfolio','philosophy','theses','research','methodology'].includes(hash))activateTab(hash);
  }catch(e){
    $('#freshness').textContent='Latest portfolio snapshot is temporarily unavailable.';
    $('#portfolio').insertAdjacentHTML('afterbegin','<article class="card"><h2>Data temporarily unavailable</h2><p>Please reload after the next successful portfolio refresh.</p></article>');
  }
}
init();
