# KIROKU V5.0.1 — Vercel TypeScript build fix

The Vercel screenshot showed that the optimized Next.js bundle compiled, but strict TypeScript failed on `setAll(cookiesToSet)` in both server-side Supabase cookie adapters.

## Files changed

- `lib/supabase/cookie-types.ts` — named, typed cookie payload shared across adapters
- `lib/supabase/proxy.ts` — type the `setAll` parameter
- `lib/supabase/server.ts` — type the `setAll` parameter

No schema, environment variables, authentication logic, styling, or page components were modified.

## Redeploy

Commit this entire project to the `main` branch of the GitHub repository connected to Vercel. Check that `package.json` is at the repository root. In Vercel, check the latest deployment build logs.

Recommended local checks (after `npm install`):

```bash
npm run typecheck
npm run build
```

This patch directly addresses errors TS7006 and TS7031 reported by the screenshot; it does not guarantee that no further errors appear after the next build step.
