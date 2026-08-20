(() => {
  const nativeFetch = window.fetch.bind(window);

  const finite = value =>
    value !== null && value !== undefined && Number.isFinite(Number(value));

  async function fetchJson(url) {
    try {
      const response = await nativeFetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
      return response.ok ? await response.json() : null;
    } catch (_) {
      return null;
    }
  }

  function buildLookup(payload) {
    const map = new Map();
    for (const row of payload?.companies || []) {
      if (!row?.company) continue;
      map.set(row.company, row);
      for (const alias of row.aliases || []) map.set(alias, row);
    }
    return map;
  }

  function mergeFundamentals(snapshot, fundamentals) {
    if (!fundamentals?.companies?.length) return snapshot;
    const lookup = buildLookup(fundamentals);
    const directFields = ['forward_pe', 'revenue_growth', 'operating_margin', 'roe'];

    const mergeRow = row => {
      const f = lookup.get(row?.company);
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
    for (const row of fundamentals.companies || []) {
      if (!row?.reverse_dcf) continue;
      const old = existingDcf.get(row.company) || {};
      existingDcf.set(row.company, { ...old, company: row.company, ...row.reverse_dcf });
      for (const alias of row.aliases || []) {
        if (existingDcf.has(alias)) {
          existingDcf.set(alias, { ...existingDcf.get(alias), ...row.reverse_dcf });
        }
      }
    }
    snapshot.reverse_dcf = [...existingDcf.values()];

    const weighted = field => {
      const usable = (snapshot.holdings || [])
        .filter(row => finite(row.weight) && finite(row[field]) && Number(row.weight) > 0);
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
      public_fundamentals_generated_utc: fundamentals.generated_utc || null,
      public_fundamentals_note: fundamentals.source_note || null,
    };
    return snapshot;
  }

  function mergeAnalytics(snapshot, analytics) {
    if (!analytics || !Array.isArray(analytics.holdings) || !analytics.holdings.length) return snapshot;

    const baseGenerated = snapshot.generated_utc || null;
    snapshot.metadata = {
      ...(snapshot.metadata || {}),
      ...(analytics.metadata || {}),
      base_snapshot_generated_utc: baseGenerated,
      public_analytics_generated_utc: analytics.generated_utc || null,
      public_analytics_note: analytics.source_note || null,
    };

    snapshot.metrics = { ...(snapshot.metrics || {}), ...(analytics.metrics || {}) };
    snapshot.portfolio_characteristics = {
      ...(snapshot.portfolio_characteristics || {}),
      ...(analytics.portfolio_characteristics || {}),
    };

    for (const key of [
      'holdings',
      'attribution',
      'factors',
      'historical_stress',
      'rolling_risk',
      'reverse_dcf',
      'timeseries',
    ]) {
      if (Array.isArray(analytics[key]) && analytics[key].length) {
        snapshot[key] = analytics[key];
      }
    }
    return snapshot;
  }

  window.fetch = async (...args) => {
    const input = args[0];
    const url = typeof input === 'string' ? input : (input?.url || '');
    const response = await nativeFetch(...args);
    if (!response.ok || !url.includes('data/portfolio_snapshot.json')) return response;

    try {
      const [snapshot, analytics, fundamentals] = await Promise.all([
        response.clone().json(),
        fetchJson('data/public_analytics.json'),
        fetchJson('data/public_fundamentals.json'),
      ]);
      let merged = mergeAnalytics(snapshot, analytics);
      merged = mergeFundamentals(merged, fundamentals);

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
      console.warn('Public data bridge fell back to base portfolio snapshot:', error);
      return response;
    }
  };

  const helper = document.createElement('script');
  helper.src = `research-display-fix.js?v=${Date.now()}`;
  helper.async = true;
  document.head.appendChild(helper);
})();
