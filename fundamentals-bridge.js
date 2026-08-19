(() => {
  const nativeFetch = window.fetch.bind(window);

  const finite = value => value !== null && value !== undefined && Number.isFinite(Number(value));

  function buildLookup(payload) {
    const map = new Map();
    for (const row of payload?.companies || []) {
      if (!row?.company) continue;
      map.set(row.company, row);
      for (const alias of row.aliases || []) map.set(alias, row);
    }
    return map;
  }

  function mergeSnapshot(snapshot, fundamentals) {
    const lookup = buildLookup(fundamentals);
    const find = company => lookup.get(company);
    const directFields = ['forward_pe', 'revenue_growth', 'operating_margin', 'roe'];

    const mergeRow = row => {
      const f = find(row?.company);
      if (!f) return row;
      const out = { ...row };
      for (const field of directFields) {
        if (finite(f[field])) out[field] = Number(f[field]);
      }
      return out;
    };

    snapshot.holdings = (snapshot.holdings || []).map(mergeRow);
    snapshot.theses = (snapshot.theses || []).map(mergeRow);

    const existingDcf = new Map((snapshot.reverse_dcf || []).map(row => [row.company, row]));
    const dcfRows = [];
    for (const holding of snapshot.holdings || []) {
      const f = find(holding.company);
      const live = f?.reverse_dcf || null;
      const old = existingDcf.get(holding.company) || {};
      if (!live && !Object.keys(old).length) continue;
      dcfRows.push({
        ...old,
        company: holding.company,
        ...(live || {}),
      });
    }
    snapshot.reverse_dcf = dcfRows;

    const weighted = (field) => {
      const usable = (snapshot.holdings || []).filter(row => finite(row.weight) && finite(row[field]) && Number(row.weight) > 0);
      const denom = usable.reduce((sum, row) => sum + Number(row.weight), 0);
      return denom > 0
        ? usable.reduce((sum, row) => sum + Number(row.weight) * Number(row[field]), 0) / denom
        : null;
    };

    snapshot.portfolio_characteristics = {
      ...(snapshot.portfolio_characteristics || {}),
      weighted_forward_pe: weighted('forward_pe'),
      weighted_revenue_growth: weighted('revenue_growth'),
      weighted_operating_margin: weighted('operating_margin'),
      weighted_roe: weighted('roe'),
    };
    snapshot.metadata = {
      ...(snapshot.metadata || {}),
      public_fundamentals_generated_utc: fundamentals?.generated_utc || null,
      public_fundamentals_note: fundamentals?.source_note || null,
    };
    return snapshot;
  }

  window.fetch = async (...args) => {
    const input = args[0];
    const url = typeof input === 'string' ? input : (input?.url || '');
    const response = await nativeFetch(...args);
    if (!response.ok || !url.includes('data/portfolio_snapshot.json')) return response;

    try {
      const [snapshot, fundamentalsResponse] = await Promise.all([
        response.clone().json(),
        nativeFetch(`data/public_fundamentals.json?v=${Date.now()}`, { cache: 'no-store' }),
      ]);
      if (!fundamentalsResponse.ok) return response;
      const fundamentals = await fundamentalsResponse.json();
      const merged = mergeSnapshot(snapshot, fundamentals);
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.set('content-type', 'application/json; charset=utf-8');
      return new Response(JSON.stringify(merged), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      console.warn('Public fundamentals bridge fell back to portfolio snapshot:', error);
      return response;
    }
  };
})();
