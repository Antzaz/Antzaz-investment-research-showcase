# Portfolio visit notifier

This folder contains the server-side endpoint used by the public GitHub Pages portfolio to send privacy-friendly visit alerts to a private Discord channel.

## Security model

- The Discord webhook URL is **never** stored in the public website or repository.
- Store it only as the Vercel environment variable `DISCORD_WEBHOOK_URL`.
- The endpoint accepts browser requests only from `https://antzaz.github.io` by default.
- Obvious bots/monitors are ignored.
- The browser suppresses repeat alerts for 30 minutes.
- The alert contains only page path, referrer hostname, device class, timestamp and optional UTM source/campaign.
- The application does not intentionally collect or persist IP addresses, browser fingerprints, names, cookies, portfolio credentials or private portfolio data.

## One-time Discord setup

1. Create or choose a private Discord channel.
2. Open **Edit Channel → Integrations → Webhooks → New Webhook**.
3. Copy the webhook URL.
4. Do not paste the webhook into source code, GitHub issues, commits, or chat messages.

## One-time Vercel setup

From the repository root:

```powershell
cd notifier
vercel
vercel env add DISCORD_WEBHOOK_URL production
vercel --prod
```

Paste the Discord webhook URL only when the Vercel CLI asks for the secret value.

If the final production hostname differs from the endpoint configured in `visit-notify.js`, update only the `ENDPOINT` constant there to:

```text
https://<your-vercel-project>.vercel.app/api/visit
```

## Optional additional origin

For a future custom portfolio domain, add a comma-separated `ALLOWED_ORIGINS` environment variable in Vercel, for example:

```text
https://portfolio.example.com,https://antzaz.github.io
```

Then redeploy the notifier.
