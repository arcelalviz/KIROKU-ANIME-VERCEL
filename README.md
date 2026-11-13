# KIROKU — Full-stack anime discovery and tracking (V5)

**React 19 • Next.js 16 • TypeScript • Supabase PostgreSQL/Auth • Kitsu anime catalog • Vercel**

This release combines the cinematic KIROKU V3.2 UI with **Step 2 (accounts + private watchlists), Step 3 (live paginated anime discovery, filters, personalized recommendations), and Step 4 (public profiles, statistics, reviews, follows, likes, reports, and moderation)**. The code is GitHub/Vercel-ready. **No real Vercel or Supabase account can be configured by a ZIP alone**: complete the short setup below and test before public launch.

## Features

| Page | Features |
|---|---|
| `/` | Cinematic opening, animated hero, Netflix-style Top 10, highly rated, currently airing, recommendation rail based on saved anime categories |
| `/search` | LIVE Kitsu API, title search, genre, TV/movie/OVA/ONA/special, season, year, release status, popularity/rating/newest/oldest sorting, real pagination |
| `/anime/[id]` | Poster, cover, synopsis, metadata, personal watchlist, related era/format, review submission, spoiler-hiding and community reviews |
| `/auth` | Supabase email/password sign-up/sign-in, email confirmation, reset-password request |
| `/account` | Display name, opt-in public handle and bio, privacy settings, manual legacy browser-list import, sign-out, moderator access when authorized |
| `/library` | Private cloud watchlist when signed in, local browser list for guests, status and episode tracking |
| `/stats` | Status breakdown, episodes watched, titles completed, yearly saved-anime activity, recent additions |
| `/community` | Latest and highest user-rated reviews, review liking/reporting, spoiler-safe display, moderator-approved public feed |
| `/u/[handle]` | Opt-in public profile, bio, public reviews, follow/unfollow, follower count; private watchlists/emails not exposed |
| `/moderation` | Approve/hide pending reviews, view and act on reports; accessible only to approved moderators |

### Real catalog and limitations

The app uses **Kitsu's live JSON:API** (`https://kitsu.app/api/edge/anime` (fallback: `https://kitsu.io/api/edge/anime`)), rather than hard-coded sample titles or the discontinued Jikan public API. Results are requested from the Next.js server with a 10-minute fetch cache. Browse advances with Kitsu's `page[offset]` and `page[limit]`, so you are **not limited to 20 anime overall**. Filter options use the documented Kitsu API. Top 10 refers to *Kitsu popularity/rating rankings*, not real Netflix viewing figures.

**No external API guarantees every anime ever released.** This source can include missing entries, limited coverage, partial ratings, occasional downtime, or third-party restrictions. KIROKU excludes adult-rated and unrated anime from discovery. No unlicensed streaming or unauthorized bulk scraping is included. Verify Kitsu production terms and artwork rights before making KIROKU a large public service.

### 1. Local smoke test

Node.js 20.9+ recommended (Node 22 supported). Extract the ZIP, open the folder holding `package.json`:

```bash
npm install
npm run preflight
npm run typecheck
npm run build
npm run dev
```

Visit `http://localhost:3000`, test `/search?q=naruto`, navigate to pages, confirm API posters and pagination. **If the Kitsu API is down, the site shows a clear error rather than invented results.**

### 2. Supabase database (ONE SQL run for a fresh project)

Create your project at https://supabase.com/dashboard. Open **SQL Editor → New query**. Paste **`supabase/KIROKU_FULL_SETUP.sql`** and Run. It includes both migrations in the correct order:

1. `supabase/migrations/20261113_kiroku_phase2.sql` — private profiles, user signup trigger, secure watchlist, RLS.
2. `supabase/migrations/20261113_kiroku_phase3_4.sql` — public opt-in profiles, follower relationships, moderator-gated reviews, report and like tables, moderation RPC, RLS/grants.

**If you already ran the Step 2 migration on your existing Supabase project, run only `20261113_kiroku_phase3_4.sql`.** Avoid re-running Phase 3/4 on a database where it already succeeded, because this migration was designed for initial installation (some `ADD CONSTRAINT` statements are not idempotent).

> Security: Public profile fields only become visible when the member opts in. Email and library rows always remain private. Reviews submitted by members are **pending** until approved by a moderator. A review returns to pending if edited. Hiding a public profile also hides their reviews from the public feed via RLS. Reporting is limited to one report per reviewer/review. Follow and like records require authentication.

### 3. Environment variables (Vercel import supported)

Find these in Supabase **Project → Connect** (publishable key, not secret key). Put them into a copy of `.env.vercel.example` and import the edited values in **Vercel → Project → Settings → Environment Variables**:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

For local use, create `.env.local` using the same variables. **Never commit real secrets.** These two keys are public client settings and rely on RLS. Select Production (and Preview if needed) and redeploy after changes. The anime catalog and guest lists work without Supabase; auth/community are available once the project is configured.

### 4. Configure email confirmation and password recovery

Supabase → **Authentication → Providers → Email**: enable email sign-ups, require confirmed email.

Supabase → **Authentication → URL Configuration**:
- Site URL: `https://YOUR-PROJECT.vercel.app`
- Redirect: `https://YOUR-PROJECT.vercel.app/auth/confirm`
- Local development redirect: `http://localhost:3000/auth/confirm`

Supabase → **Authentication → Email Templates**: use the provided SSR callback link in both templates:

**Confirm signup**:
```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Confirm your KIROKU account</a>
```
**Reset password**:
```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
```

Configure a production SMTP provider before inviting large numbers of users. Supabase's default email service is not intended for public-scale mailing. If you use a custom domain, update Site URL and redirect entries accordingly.

### 5. Make YOUR account a moderator

Sign up and verify your own account first. Open Supabase **Authentication → Users** and copy its UUID. Run in **SQL Editor**, replacing the UUID with your actual user ID:

```sql
insert into public.moderators (user_id)
values ('YOUR-USER-UUID')
on conflict do nothing;
```

Visit `/moderation` when logged in. Only the account(s) you manually add can publish or hide reviews. **Never let user-generated content bypass moderation by granting service-role credentials to the browser.**

### 6. Deploy GitHub → Vercel

1. Create or open your GitHub repo for KIROKU. Put the extracted **contents** in the repository root (`package.json` must be at top level).
2. Commit to `main`, push, and connect the repository to **Vercel**. Framework **Next.js**, Root Directory `./`, Build Command `npm run build`, Output Directory default.
3. Add environment variables (step 3) and redeploy, then test real sign-up and login, profile, review moderation, and community.
4. For a previous Vercel project that was disconnected from Git, connect the **new** repository under **Settings → Git** and confirm Production branch is `main`.

### 7. Recommended acceptance test

- [ ] Homepage, Top 10, cinematic intro, and responsive cards load.
- [ ] `/search` returns real titles, category filters work, next/previous pages return different results; show meaningful error when upstream API is unavailable.
- [ ] `anime/[id]` resolves to real metadata and a working watchlist action.
- [ ] Register account A, verify email, sign in, add anime, edit episode progress; reload on second device.
- [ ] Use a separate account B: ensure it **cannot read or write** A's watchlist, profile when private, or reviews awaiting moderation.
- [ ] A's profile is private by default. Enable handle/public profile and view `/u/handle` in a separate browser.
- [ ] Follow A from B and confirm count; switch A back to private and confirm no public profile or public reviews are accessible.
- [ ] Write review for a title. Confirm it is visible only to writer/moderator while pending; moderator approves; public sees it; spoiler hiding, likes, and reports function.
- [ ] `/stats` updates after library changes; old browser list can be manually imported without replacing cloud entries.
- [ ] Mobile 360px, tablet 768px, desktop 1440px: no navigation overlap, intro is skippable, reduced-motion settings are respected.

## Platform architecture

Next.js App Router renders catalog pages and server-side Kitsu requests. React client components handle interactive UI; Supabase browser/SSR clients handle email authentication, user data and community activity. PostgreSQL RLS—not frontend hiding—enforces ownership, public opt-in, moderation and access rules. No service-role/secret key is embedded in the browser or ZIP.

## Production caveats

- This ZIP is a **complete source implementation** of the specified functionality, but your real Supabase project, actual email sending, authorization, API uptime, and Vercel build **cannot be proven without your connected services and end-to-end testing**.
- No live chat or unmoderated discussion threads are included; community functionality is opt-in reviews, follows, reactions and reports. Profiles are pseudonymous. Provide clear community rules, reporting, privacy terms, and content retention/deletion handling before public beta.
- Real personalization is a lightweight genre-similarity recommendation seeded from up to three saved anime—not a trained ML recommendation engine.
- Kitsu is an external data source; ensure permission for your intended production use and verify artwork licensing. If you plan to compete at MyAnimeList scale, you will eventually need a separately licensed/in-house anime catalog, stronger search infrastructure, performance monitoring, error tracking and moderation operations.
- A guest list is stored on the same browser/origin under `kyo:library:v1`, preserving earlier KIROKU versions. To sync it, sign in and **manually** choose Import browser titles.


## Troubleshooting: anime pages are empty (catalog hotfix)

Open `https://YOUR-VERCEL-DOMAIN.vercel.app/api/catalog-health` in a browser.
The endpoint tests a real request from Vercel to Kitsu, without requiring sign-in.

- `ok: true`, `sampleCount: 2`: Vercel can reach Kitsu. If the homepage is still empty, inspect its Vercel **Functions** logs and reload `/search`.
- `ok: false`, an `HTTP` error or timeout: the upstream anime API is inaccessible, or a query is being rejected. Check the reported HTTP status.
- `ok: false`, `Unexpected catalog response format`: Kitsu returned a nonstandard response.

This patch removes the unsupported `PG-13` Kitsu filter (valid Kitsu filters are `G`, `PG`, `R`, `R18`) and retries using an alternative official Kitsu hostname. Public discovery includes only `G` and `PG` entries. For a more expansive age-appropriate catalog later, consider adding a separately licensed source with its own content ratings.

Deploy this ZIP's **contents**, not the outer folder. No Supabase database migration is required for this patch.
