(() => {
  const fmt = (v, d=2) => v == null || !Number.isFinite(Number(v)) ? "—" : Number(v).toLocaleString("en-US", {minimumFractionDigits:d, maximumFractionDigits:d});
  const pct = v => v == null ? "—" : (v >= 0 ? "+" : "") + fmt(v*100) + "%";
  const escape = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  fetch("data/stock_quotes.json?v=" + Date.now(), {cache:"no-store"}).then(r => {if (!r.ok) throw Error(r.status); return r.json();}).then(data => {
    const host = document.getElementById("portfolio");
    if (!host || document.getElementById("stockQuotesCard")) return;
    const article = document.createElement("article");
    article.className = "card";
    article.id = "stockQuotesCard";
    const headers = ["Company","Latest close","As of","1D","1W","1M","3M","6M","1Y"];
    article.innerHTML = '<h2>Stock prices & performance</h2><p class="muted">Latest available adjusted daily close and historical changes for all portfolio holdings. Prices may be delayed. Purchase prices are private and not published.</p><div class="table-wrap"><table><thead><tr>' + headers.map(h=>'<th>'+h+'</th>').join("")+'</tr></thead><tbody>' + (data.stocks||[]).map(s => '<tr><td>'+escape(s.company)+'</td><td>'+ (s.current_price == null ? "—" : fmt(s.current_price) + ' ' + escape(s.currency||""))+'</td><td>'+escape(s.as_of||"—")+'</td>'+["1D","1W","1M","3M","6M","1Y"].map(k=>'<td>'+pct(s.changes?.[k])+'</td>').join("")+'</tr>').join("") + '</tbody></table></div><p class="muted">Refresh generated: '+escape(data.generated_utc||"unknown")+(data.market_as_of?' · Latest observed market close: '+escape(data.market_as_of):'')+'</p>';
    host.prepend(article);
  }).catch(e => console.warn("Public stock quotes unavailable",e));
})();
