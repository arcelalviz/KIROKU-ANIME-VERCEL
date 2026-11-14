# KIROKU V5.0.3 — Smooth Motion Update

This is an additive update to **the V5.0.2 working anime catalog release**. It does not include the V6 watching/ani.pm work.

## Improvements

- Explore filters now use Next.js client-side navigation instead of browser form submission.
- The Explore page and anime details have lightweight loading skeletons for slow Kitsu API responses.
- Page transitions, hero fades, and scroll reveals use mostly `opacity` and `transform` rather than blur/brightness on large areas.
- Mobile devices render fewer ambient particles and a lighter navbar blur. Existing reduced-motion support remains in place.
- Anime posters use lazy loading and asynchronous decoding; the first spotlight image retains elevated fetch priority.
- The first-session cinematic opening is shorter. The replay control still works.

## Deployment

Replace your existing V5.0.2 repository files with this ZIP's contents and push to `main`. Do not delete `.env.local` in your local workspace. The original Supabase migrations and environment variable names remain unchanged.

Run `npm install`, `npm run preflight`, `npm run typecheck`, `npm run build` where dependencies are available. Then check Vercel Build Logs.

Smoke test `/`, `/search`, `/anime/<id>`, `/auth`, `/library`, `/stats`, `/community`, and an approved review. Check on desktop and mobile; verify filter submit no longer causes a full document reload.

Only browser and live-host tests can prove actual FPS or response-time improvements. Static source checks are not performance benchmarks.
