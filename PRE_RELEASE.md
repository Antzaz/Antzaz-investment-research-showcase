# Local pre-release showcase

Branch: `pre-release-showcase`

Purpose: test recruiter-facing public-site features locally before anything is promoted to `main` / GitHub Pages.

## Architecture

- Full private system: `Antzaz-equity-research-model` / Streamlit
- Pre-release showcase: this branch, local-only
- Real public showcase: `main` / GitHub Pages
- Vercel remains only for the `/api/visit` Discord notifier used by the live public site

## Included staging modules

- Portfolio Optimization preview
- ML & Model Governance
- Market Expectations / reverse DCF
- AI Optionality scenario overlay
- Featured Research entry point
- Research methodology flow
- Recruiter-facing homepage positioning
- Release Review gate stored in browser `localStorage`

## Data boundary

This branch continues to consume only the already-sanitized showcase data. It does **not** publish shares, cost basis, portfolio value, transactions, credentials, private notes, raw ML databases, raw feature matrices, private optimizer outputs or model secrets.

Where a private-system module does not yet have a sanitized export, the staging UI describes the real methodology and labels the missing output explicitly instead of fabricating numbers.

## Safety controls

- GitHub Pages deployment is disabled on this branch.
- Public-data refresh is disabled on this branch and cannot push staging data into `main`.
- The public Discord visitor beacon is disabled on this branch.
- `robots.txt` blocks indexing if the branch is ever served accidentally.

## Run locally on Windows

From the showcase repository:

```powershell
git fetch origin
git switch pre-release-showcase
git pull
.\preview.cmd
```

`preview.cmd` is the preferred Windows launcher because it works even when PowerShell script execution is disabled.

The launcher binds only to `127.0.0.1`, so the preview is visible only on the local computer at `http://127.0.0.1:8000`.

If you intentionally allow local PowerShell scripts, `preview.ps1` remains available as an alternative launcher.

## Promotion rule

Nothing on this branch should be merged wholesale into `main`. Review candidate modules in the staging site's **Release Review** tab, then promote only the approved files/changes to `main`.

The Promote/Hold choices are intentionally local browser state and never publish automatically.
