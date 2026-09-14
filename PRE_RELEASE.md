# Private pre-release showcase

Branch: `pre-release-showcase`

Purpose: test recruiter-facing public-site features before anything is promoted to `main` / GitHub Pages.

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

## Visitor notifications

The public Discord visitor beacon is disabled on this branch so private staging visits do not generate live-site notifications.

## Promotion rule

Nothing on this branch should be merged into `main` until it has been reviewed in the staging site's **Release Review** tab. The Promote/Hold choices are intentionally local browser state and do not auto-publish.

## Recommended private deployment

Deploy this branch as a separate Vercel project named `antzaz-investment-research-preview`, enable Vercel Authentication for all deployments, and keep `main` / GitHub Pages unchanged.

The source branch is in the existing public GitHub repository. Vercel Authentication makes the deployed site private, but someone who intentionally browses the public repository can still inspect branch source. If private source code is also required, move this branch to a separate private GitHub repository.
