# KIROKU V5.0.2 — anime catalog connectivity fix

## Why did the site show no anime?

The existing Kitsu request sent an unsupported `PG-13` filter value. Kitsu's documented values are `G`, `PG`, `R`, `R18`. An upstream HTTP error was caught and rendered as an empty listing, so the homepage appeared empty even though Supabase worked. Kitsu also sometimes blocks traffic from some cloud networks.

## Fixes included

1. Valid Kitsu age filter (`G,PG`) with age-appropriate content gating. This narrows discovery and does not promise every anime.
2. Primary `https://kitsu.app/api/edge` and fallback `https://kitsu.io/api/edge` for public server-side reads.
3. Diagnostic endpoint at `/api/catalog-health`, which tests a live sample request and reports success or upstream failure.
4. Runtime homepage and search-page rendering to prevent empty feeds being baked into a deployment.
5. Error-state link to the catalog health endpoint from empty homepage rails.

## Deploy

Replace the existing repository source with this archive's **contents** (keep your `.env.local` out of Git), then:

```bash
npm install
npm run preflight
npm run typecheck
npm run build
git add .
git commit -m "fix: restore anime catalog and add connection diagnostics"
git push origin main
```

No Supabase SQL changes or new environment variables are required.

## Verify after Vercel says Ready

1. Open `https://YOUR-VERCEL-DOMAIN.vercel.app/api/catalog-health`.
2. If response contains `"ok": true`, open `/search` and check for anime results.
3. If response contains `"ok": false`, open Vercel -> Observability / Functions logs and inspect the reported error. The problem is likely upstream network access, HTTP rejection or a changed Kitsu API.

## Limitations

No real remote Kitsu request or Vercel build could be executed from the packaging environment. Syntax, static preflight, and CSS parsing passed; external connectivity remains to be verified on Vercel.
