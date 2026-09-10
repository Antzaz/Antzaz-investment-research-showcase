const DEFAULT_ALLOWED_ORIGINS = [
  'https://antzaz.github.io',
];

function allowedOrigins() {
  const extra = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]);
}

function setCors(res, origin) {
  if (origin && allowedOrigins().has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

function isBot(userAgent = '') {
  return /bot|crawler|spider|headless|lighthouse|pagespeed|uptime|monitor|preview|curl|wget|python-requests|github|vercel/i.test(userAgent);
}

function clean(value, max = 120) {
  return String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const raw = typeof req.body === 'string' ? req.body : '';
  if (!raw || raw.length > 4096) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

export default async function handler(req, res) {
  const origin = clean(req.headers.origin, 200);
  setCors(res, origin);

  if (req.method === 'OPTIONS') {
    if (!allowedOrigins().has(origin)) return res.status(403).end();
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!allowedOrigins().has(origin)) {
    return res.status(403).json({ ok: false, error: 'origin_not_allowed' });
  }

  const userAgent = clean(req.headers['user-agent'], 300);
  if (!userAgent || isBot(userAgent)) {
    return res.status(204).end();
  }

  const body = parseBody(req);
  if (body.event !== 'portfolio_open') {
    return res.status(400).json({ ok: false, error: 'invalid_event' });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    return res.status(503).json({ ok: false, configured: false, error: 'discord_not_configured' });
  }

  const page = clean(body.page || '/', 160);
  const referrer = clean(body.referrer || 'Direct / unknown', 120);
  const device = clean(body.device || 'Unknown', 40);
  const source = clean(body.source || '', 60);
  const campaign = clean(body.campaign || '', 80);

  const fields = [
    { name: 'Page', value: page || '/', inline: false },
    { name: 'Referrer', value: referrer || 'Direct / unknown', inline: true },
    { name: 'Device', value: device || 'Unknown', inline: true },
  ];
  if (source) fields.push({ name: 'UTM source', value: source, inline: true });
  if (campaign) fields.push({ name: 'Campaign', value: campaign, inline: true });

  const payload = {
    username: 'Portfolio Visitor',
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: 'Portfolio viewed',
        description: 'A visitor opened the public investment research portfolio.',
        fields,
        timestamp: new Date().toISOString(),
        footer: { text: 'Privacy-friendly alert · no IP address or fingerprint stored' },
      },
    ],
  };

  try {
    const discord = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!discord.ok) {
      console.error(`Discord webhook returned HTTP ${discord.status}`);
      return res.status(502).json({ ok: false, error: 'discord_delivery_failed' });
    }

    return res.status(204).end();
  } catch (error) {
    console.error('Discord webhook delivery failed:', error?.message || 'unknown error');
    return res.status(502).json({ ok: false, error: 'discord_delivery_failed' });
  }
}
