# Studently

India's smartest student platform — scholarships, internships, jobs, and AI career tools.
Built with Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## What's included

### Student-facing pages (frontend)
| Route            | Page                                                  |
|-------------------|-------------------------------------------------------|
| `/`               | Homepage — hero, live scholarship pool, weekly test picker, features. Nav CTA switches between "Start Free" / "Dashboard" based on real session state. |
| `/auth`           | **Real signup/login** — creates an actual `User`+`Student` row, hashes the password with bcrypt, issues a session cookie. Onboarding (profile step) writes straight to the database. |
| `/dashboard`      | **Protected, real data** — profile completion, eligibility/resume scores, application tracker, and "open right now" cards are all pulled live from the database for the logged-in student. Requires login (enforced by `middleware.ts`). |
| `/scholarships`   | Live data from `/api/scholarships`. "Apply" creates a real `Application` row (redirects to `/auth` first if you're not logged in). |
| `/jobs`           | Live data from `/api/jobs`, same real "Apply" flow as scholarships. |
| `/weekly-test`    | Real category → live-test → timed attempt → server-scored submission → live leaderboard, backed by `WeeklyTest`/`Question`/`TestAttempt`. |
| `/ai-tools`       | Real Claude-powered generation (resume, SOP, cover letter, interview prep, career roadmap, scholarship match) via `/api/ai-tools`. Requires `ANTHROPIC_API_KEY`. |
| `/search`         | Full-text search across every live job, internship, and scholarship — the UI for `/api/search`, see the Opportunity Aggregation Engine section below. |

**What "real" means here**: sign up on `/auth`, and a `User` + `Student` row is actually
created in Postgres with a bcrypt-hashed password and a signed session cookie
(`studently_session`, 30-day expiry). Log back in and you'll see the same profile,
same applications, same scores — because they're read from the database on every load,
not hardcoded. Visiting `/dashboard`, `/weekly-test`, or `/ai-tools` without a session
redirects you to `/auth` (enforced server-side in `middleware.ts`, not just hidden in
the UI).

**Personalized recommendations** on `/dashboard` and full-text `/api/search` are powered
by the Opportunity Aggregation Engine below — see that section for how listings get
their `aiTags` and search index.

### Admin panel (new)
| Route                      | Page                                          |
|-----------------------------|------------------------------------------------|
| `/admin/login`               | Admin login (phone + password)                |
| `/admin`                     | Overview — live platform stats                |
| `/admin/scholarships`        | Manage scholarships (list, create, delete)    |
| `/admin/jobs`                | Manage jobs & internships (list, create, delete) |
| `/admin/question-bank`       | Manage weekly tests and their questions       |
| `/admin/sponsors`            | Manage sponsors                               |
| `/admin/payments`            | Revenue summary + transaction list            |
| `/admin/students`            | Search/browse students                        |
| `/admin/notifications`       | Broadcast a notification to all students      |
| `/admin/fraud-detection`     | Run fraud scan + review flags                 |

**Admin login credentials** (set in `.env.local`, not committed):
- Phone: `ADMIN_PHONE`
- Password: `ADMIN_PASSWORD` (plain text — set both env vars to change credentials)

### Backend (new)
- **`prisma/schema.prisma`** — full data model: users, students, scholarships, jobs,
  weekly tests, questions, test attempts, applications, saved items, sponsors, payments,
  badges/XP, notifications, fraud flags.
- **API routes** under `app/api/`:
  - `auth/signup`, `auth/login`, `auth/logout` — **student** session auth (JWT in an httpOnly cookie, `studently_session`)
  - `students/me` — get/update the logged-in student's own profile
  - `applications` — list/create the logged-in student's applications
  - `saved-items` — list/toggle the logged-in student's saved scholarships/jobs
  - `admin/login`, `admin/logout` — **admin** session auth (separate cookie, `studently_admin_session`)
  - `scholarships`, `scholarships/[id]` — CRUD
  - `jobs`, `jobs/[id]` — CRUD
  - `weekly-tests`, `weekly-tests/[id]/questions` — test + question bank CRUD
  - `students` — admin search/list of all students
  - `payments` — list + revenue totals
  - `sponsors` — list/create
  - `notifications` — list + broadcast
  - `fraud-flags` — list + run detection scan
  - `analytics/overview` — powers the admin dashboard stat cards
- **`middleware.ts`** — protects three separate zones:
  1. `/admin/*` + `/api/admin/*` — requires an admin session
  2. `/dashboard`, `/weekly-test`, `/ai-tools` + `/api/students/me`, `/api/applications`,
     `/api/saved-items` — requires a student session
  3. Everything else (`/`, `/scholarships`, `/jobs`, `/auth`) stays public
  Unauthenticated page requests redirect to the right login page; unauthenticated API
  requests get a `401`.
- **`lib/auth.ts`** — JWT sign/verify using `jose` (Edge-runtime compatible, so it works
  in `middleware.ts` as well as regular API routes).
- **`lib/prisma.ts`** — Prisma client singleton (avoids exhausting connections during
  Next.js hot reload in dev).

## Real scholarship data — Studently vs. external

Scholarships now carry a `source` field with three values, and the UI treats them
differently on purpose:

| Source | What it means | How "Apply" works |
|---|---|---|
| `STUDENTLY_WEEKLY` | Funded directly from Studently's own weekly-test scholarship pool | Applying creates a real `Application` row in-app |
| `GOVERNMENT` | A real government scheme, verified against its official page | "Apply" links out to the official government site — Studently never pretends to process these itself |
| `PRIVATE` | A real private/corporate scholarship, verified against its official page | Same — links out to the official site |

The seed data (`prisma/seed.mjs`) includes real scholarships current as of July 2026:

- **Central Sector Scheme of Scholarship (CSSS)** — ₹20,000, via [National Scholarship Portal](https://scholarships.gov.in/)
- **AICTE Pragati Scholarship for Girls** — ₹50,000/year, via [AICTE](https://www.aicte-india.org/schemes/students-development-schemes/Pragati)
- **AICTE Saksham Scholarship** — ₹50,000/year, for specially-abled students
- **National Means-cum-Merit Scholarship (NMMSS)** — ₹12,000/year
- **Reliance Foundation Undergraduate Scholarship** — up to ₹2 lakh, via [Reliance Foundation](https://www.scholarships.reliancefoundation.org/UG_Scholarship.aspx)
- **Reliance Foundation Postgraduate Scholarship** — up to ₹6 lakh
- Two **Studently Weekly Pool** scholarships (Banking, JEE categories) — Studently's own product

Amounts, eligibility, and deadlines for the government/private entries are accurate as
of when this was written, but these change every cycle — `officialUrl` on each is the
source of truth. The admin panel **requires** an official URL before you can publish any
`GOVERNMENT` or `PRIVATE` scholarship, specifically so nothing external ever gets listed
without a way to verify it.

### Jobs & internships: real data, same discipline

Unlike scholarships, actual private-company job openings churn daily — a specific
Razorpay or Zoho listing hardcoded today would be wrong or stale within days. So instead
of fabricating company postings, `Job` carries the same real-vs-internal distinction as
scholarships, applied to what's actually stable: government recruitment exams and
internship schemes.

| Source | What it means | How "Apply" works |
|---|---|---|
| `STUDENTLY_CURATED` | A specific listing Studently has itself vetted (e.g. a direct company posting) | Applying creates a real `Application` row in-app |
| `GOVERNMENT_EXAM` | A real, current government recruitment exam, verified against its official site | "Apply" links out to the official site — never processed in-app |
| `GOVERNMENT_SCHEME` | A real government internship/apprenticeship scheme | Same — links out |
| `EXTERNAL_PORTAL` | A real government aggregator portal rather than one listing | Links to the portal itself |

The seed data (`prisma/seed.mjs`) includes real listings current as of July 2026:

- **SSC CGL 2026** — ~12,256 vacancies, Pay Level 4–8 (₹25,500–₹1,51,100), via [ssc.gov.in](https://ssc.gov.in/)
- **IBPS PO/MT 2026 (CRP-XVI)** — 6,715 vacancies across 11 public sector banks, applications open until 21 July 2026, via [ibps.in](https://www.ibps.in/)
- **PM Internship Scheme 2026** — rolling internships at India's top 500 companies by CSR spend, ₹6,000 joining grant (exact monthly stipend varies by source — confirm on the portal), via [pminternship.mca.gov.in](https://pminternship.mca.gov.in/)
- **National Career Service (NCS)** — the real government portal for verified private-sector openings, via [ncs.gov.in](https://www.ncs.gov.in/), listed as an `EXTERNAL_PORTAL` rather than a fake specific role

Same rule as scholarships: the admin panel requires `officialUrl` for anything that
isn't `STUDENTLY_CURATED`, and dates/stipends should be re-verified against the official
link before students rely on them, since notification windows and figures shift often.

## Google sign-in (student login/signup)

Students can now sign up or log in with Google, alongside the existing phone +
password flow. This is a plain OAuth 2.0 authorization-code flow (no NextAuth
dependency, kept consistent with the app's existing lightweight JWT-cookie
sessions) — see `lib/google-oauth.ts` and `app/api/auth/google/`.

**Setup:**

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth client ID** (type: *Web application*).
2. Add an **Authorized redirect URI** for every environment you run in:
   - `http://localhost:3000/api/auth/google/callback` (local dev)
   - `https://your-app.onrender.com/api/auth/google/callback` (production — use
     your real Render URL)
3. Copy the client ID and secret into `.env.local`:
   ```
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   ```
4. Leave `GOOGLE_REDIRECT_URI` unset — it's derived automatically from the
   incoming request's public host, so the same code works in dev and prod
   without extra config. Behind a reverse proxy (Render, and most PaaS
   providers), the app trusts the `X-Forwarded-Host` / `X-Forwarded-Proto`
   headers the proxy sets to the real public hostname, rather than the raw
   `Host` header Next.js's Node process sees — the latter can resolve to the
   container's internal address (e.g. `localhost:10000` on Render) instead of
   your real domain, which would otherwise break the OAuth redirect. Only set
   `GOOGLE_REDIRECT_URI` explicitly if your proxy doesn't forward those headers.

**How account matching works:** a returning Google user is matched by Google's
stable account ID (`googleId`), not just email, so a changed email on the
Google side won't create a duplicate account. If someone previously signed up
with phone + password and later uses Google with the *same, Google-verified*
email, the accounts are linked automatically rather than creating a second
one — an unverified email is never trusted for this, to avoid account
takeover. New Google sign-ups go through the same Profile → Goals onboarding
as manual signups; returning ones skip straight to the dashboard.

`User.phone` is now optional in the schema (it was required before) since
Google accounts don't come with a phone number — existing manual-signup flows
are unaffected.

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up the database.** You need a real PostgreSQL instance (local, Docker, or a
   hosted one like Neon/Supabase/Railway). Copy the env template and fill it in:
   ```bash
   cp .env.example .env.local
   ```
   A working `.env.local` with the admin credentials already hashed is included in this
   zip for convenience — you only need to replace `DATABASE_URL` with your own database.

3. **Create the schema and seed sample data:**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

4. **Run the app:**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000 for the student site, and
   http://localhost:3000/admin/login for the admin panel.

## Design system

- **Colors**: white base, `#4F46E5 → #7C3AED → #2563EB` gradient, amber `#F0A93A`
  reserved for "earned" moments, emerald for live states.
- **Type**: Space Grotesk (display), Inter (body), IBM Plex Mono (all numbers/ranks/timers).
- **Tokens**: see `tailwind.config.ts`.

## Database schema sync (important — read if you add fields)

This project has **no `prisma/migrations` history** — the schema has always been
applied to the live database directly rather than through tracked migration
files. That's fine day-to-day, but it means schema changes only take effect in
production if something actually pushes them there — `next build` alone never
touched the database, so several recent schema changes (scholarship/job source
fields, then `User.googleId`/`avatarUrl`) shipped in code before the live
database actually had the columns, which is exactly what caused the Google
sign-in 500 error.

Fixed by adding `prisma db push` to the build itself:

```json
"build": "prisma generate && prisma db push --skip-generate && next build"
```

Every deploy now syncs `schema.prisma` to the real database automatically,
before the app builds against it — schema drift like that shouldn't happen
again. `db push` refuses to apply anything that would lose data without an
explicit `--accept-data-loss` flag, so it fails loudly rather than silently
dropping a column.

If this project grows past one contributor/environment, switching to real
`prisma migrate` history (reversible, reviewable migration files instead of
direct sync) is worth doing — `db push` is the right tool for "one database,
keep it in sync automatically," not for coordinating schema changes across a
team or multiple environments.

## Security notes

- `.env.local` is gitignored — never commit it. Rotate `JWT_SECRET` and the admin
  password before any real deployment; the values shipped here are for local development
  only.
- Admin login has basic in-memory rate limiting (5 attempts / 15 min per IP). For a
  multi-instance production deployment, replace this with a Redis-backed limiter.
- All `/admin` pages and `/api/admin` routes are protected by `middleware.ts`. Every
  other `/api/*` route in this build (scholarships, jobs, etc.) is currently open —
  add student session auth before launch so only logged-in students can apply, save
  items, or submit test attempts.

## Not yet built (real next phases)

1. **Payments** — Razorpay checkout integration; the `Payment` model and admin revenue
   view exist, but there's no checkout flow yet.
2. **Gamification** — XP levels, badges, daily streak, weekly challenge, referral
   rewards. The schema has `xp`, `level`, `currentStreak`, `Badge`/`StudentBadge` — no
   UI or awarding logic yet.
3. **Redis** — for real-time weekly-test leaderboards and rate limiting at scale.
4. **Notifications delivery** — the broadcast API writes rows to the `Notification`
   table; actually sending email/SMS/push still needs a provider (e.g. Resend, Twilio,
   FCM) wired in.
5. **PWA/offline** — `manifest.json` is scaffolded; no service worker yet.

## Opportunity Aggregation Engine

Background workers that pull real jobs/internships/scholarships from official sources,
clean them up with AI, dedupe, categorize, store them, and keep them fresh —
so the site doesn't depend on someone manually retyping listings.

### How it fits together

```
Source (registered feed/API)
   │
   ▼
connector (lib/aggregator/connectors/*) — fetches raw items
   │
   ▼
normalizeWithAI (lib/aggregator/normalize.ts) — Claude turns messy raw text
   │                                              into clean structured fields
   ▼
reconcileCategory (lib/aggregator/categorize.ts) — cheap keyword safety net
   │
   ▼
persistJob / persistScholarship (lib/aggregator/persist.ts) — dedupe + upsert
   │
   ▼
Job / Scholarship tables  →  tsv (generated column) → /api/search
                          →  aiTags                  → /api/recommendations
```

Every cycle also runs `runExpirySweep()` (`lib/aggregator/expire.ts`), which closes out
listings whose deadline passed, or that an aggregated source hasn't re-confirmed in 14
days (likely filled/removed upstream).

### Sources — where data comes from (no unauthorized scraping)

Registered in the `Source` table (manage via `/admin/sources`), each with a `kind`:

| Kind | What it is | Example |
|---|---|---|
| `GREENHOUSE_API` | Greenhouse's own public Job Board API — meant for exactly this | `boards-api.greenhouse.io/v1/boards/{token}/jobs` |
| `LEVER_API` | Lever's own public Postings API — meant for exactly this | `api.lever.co/v0/postings/{account}` |
| `RSS_FEED` | Any org's published RSS/Atom feed | Government ministry press releases |
| `JSON_API` | A generic REST/JSON API, field-mapped via `config` | `data.gov.in` open datasets (needs `DATA_GOV_IN_KEY`) |
| `PARTNER_FEED` | A JSON feed a partner exposes under direct agreement | A college placement cell's own feed |
| `NOTICE_BOARD` | A public .gov.in/.ac.in notice page, CSS-selector-configured | University placement notices |
| `AI_DEEP_SEARCH` | Admin-triggered: Claude, given a `web_search` tool, searches the live web for real listings matching a query and extracts + normalizes them in the same call | "fresher backend developer jobs Bangalore" |

`NOTICE_BOARD` checks `robots.txt` before every fetch and skips the source if disallowed
— see `lib/aggregator/connectors/noticeBoard.ts`. **LinkedIn, WorkIndia, and similar
third-party platforms are intentionally not supported connectors** — only official
APIs, published feeds, direct partnerships, or permitted public government/university
pages. Seed data (`prisma/seed.mjs`) enables two real, key-free sources (GitLab via
Greenhouse, Lever's own careers page) out of the box, plus disabled worked examples for
the other four kinds — fill in real URLs/selectors/keys and flip `enabled: true`.

### Running it

Three ways to trigger a cycle — pick whichever fits your host:

1. **External scheduler + HTTP endpoint** (recommended for Render/Vercel):
   set `CRON_SECRET`, then have a Render Cron Job (or GitHub Actions schedule, or a
   plain crontab) call:
   ```
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<your-app>/api/cron/aggregate
   ```
2. **One-off script** — `npm run aggregate` — runs a single cycle and exits. Good for
   local testing or an external cron that can run a Node script directly instead of
   curling an endpoint.
3. **Persistent worker** — `npm run worker` — a long-running process (for a Render
   "Background Worker" service or similar) that ticks every `WORKER_TICK_MINUTES`
   (default 15) and calls the same cycle. Each `Source` still only actually fetches
   once its own `fetchIntervalMins` has elapsed, so frequent ticks are cheap.

All three call the same `runAggregationCycle()` in `lib/aggregator/runAggregation.ts` —
no duplicated logic between them.

### Search & recommendations

- **`GET /api/search?q=...&kind=JOB|SCHOLARSHIP|ALL&location=...`**, with a real UI at
  **`/search`** — full-text search over `Job`/`Scholarship`, backed by a generated `tsv`
  (tsvector) column + GIN index. Since this project uses `prisma db push` (no migration
  history), that generated column can't be expressed in `schema.prisma` — it's dropped
  before every `db push` and recreated after (`npm run db:pre-push-cleanup` then
  `npm run db:search-index`, both folded into `npm run build` already), because Postgres
  won't let a plain `db push` alter a `GENERATED ALWAYS AS (...) STORED` column once it
  already exists from a prior deploy. Note `/jobs` and `/scholarships` still filter
  client-side over the currently loaded list rather than calling this index — `/search`
  is the dedicated full-text entry point.
- **`GET /api/recommendations`** (auth required) — rule-based scoring of the student's
  qualification/branch/city against each listing's `aiTags` (set by the AI normalizer
  at ingest time) — fast enough to rank hundreds of candidates per request without an
  AI call on every page load. Surfaced on `/dashboard` as "Recommended for you".

### Admin controls

`/admin/sources` — add/edit/enable/disable a source, see its last run status and error,
and trigger an immediate run outside its normal schedule. Every run is logged to
`IngestRun` (fetched/created/updated/skipped/expired counts + any error).

`/admin/ai-job-search` — a friendlier, purpose-built trigger for `AI_DEEP_SEARCH`
sources: type what you're looking for ("fresher backend developer jobs", "SSC/govt
fresher notifications"), optional locations/keywords, and run it. Behind the scenes it
finds-or-creates a `Source` keyed by a hash of the query (`lib/aggregator/connectors/
aiDeepSearch.ts` + `app/api/admin/ai-job-search/route.ts`), so re-running the *same*
search later updates the listings it already found (refreshed `lastSeenAt`, corrected
deadlines) instead of duplicating them — the normal `ingestSourceId + externalId` upsert
and cross-source fuzzy dedupe in `persist.ts`/`dedupe.ts` apply exactly as they do for
every other connector. Every run's Claude spend (input/output tokens, number of
`web_search` calls, and the resulting USD cost — priced from the constants in
`lib/aggregator/aiCost.ts`) is written onto its `IngestRun` row and shown per-search and
as a running total on the page.
