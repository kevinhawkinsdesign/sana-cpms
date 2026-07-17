# sana-cpms

A fully self-contained **demo replica** of Kabisa's EV charge-point management
system (CPMS) frontend — a Next.js app for managing EV charging stations,
sessions, fleets, and tax compliance across Rwanda and Kenya. This repo has
**no real backend**: every API call is answered by an in-browser mock layer
seeded from a real snapshot of production charging-session data, so the whole
app runs as a static site with working login, live-feeling data, and every
role's console reachable with zero infrastructure.

**Live demo:** https://kevinhawkinsdesign.github.io/sana-cpms/

> This is a demo/portfolio build, not the production app. Visual branding is
> still Kabisa's; a "Sana" rebrand is planned but not yet applied. See
> [Demo mode & caveats](#demo-mode--caveats) below for what's fake and what's real.

## Try it now

Go to the [live demo](https://kevinhawkinsdesign.github.io/sana-cpms/), open
**Login**, and enter **any email/password** — nothing is actually checked.
Which seeded persona you land as depends on what you type in the email field:

| Type an email containing... | You get logged in as |
|---|---|
| `admin` (or anything unrecognized) | **Platform Admin** — full console access, every org, every feature |
| `org` or `owner` | **Organization Admin** — one charging network (Kabisa EVP Network) |
| `operator` or `staff` | **Station Operator** — shift check-in/out, session start/stop |
| `customer`, `fleet`, or `driver` | **Fleet Customer** — a business account (GreenRide Africa) with real session history |

For example: `admin@demo.com`, `owner@anything.com`, `operator@x.com`,
`customer@x.com`.

## What's real vs. mocked

- **Real:** the UI, the client-side logic, ~2,900 seeded charging sessions
  derived from an actual production data export, OpenStreetMap map tiles and
  geocoding, routing via OSRM.
- **Mocked:** every `/api/*` call — intercepted in the browser and answered
  from an in-memory dataset (see [Architecture](#architecture) below). No
  server, no database, no real payments, no real SMS/email, no real tax
  authority (RRA/EBM) integration.

## Architecture

This started as a normal Next.js app talking to a real backend
(`gokabisa/frontend-nextjs`). To run as a zero-infrastructure demo on GitHub
Pages, it was converted in two stages:

**1. Mock backend.** `lib/mock/` is a small fake API server that runs
anywhere JS runs — in Node during `next dev`, or entirely client-side in the
static export:
- `lib/mock/seed/data.json` — seed dataset: countries, organizations,
  chargers/guns/pedestals, vehicles, operators, customers, and ~2,900 real
  charging sessions, plus synthetic shop vehicles/orders and fleet
  businesses layered on top.
- `lib/mock/db.ts` — clones the seed into an in-memory store once per
  session; creates/edits during a demo persist until the tab is closed.
- `lib/mock/router.ts` + `matcher.ts` — a tiny pattern-matching router
  (`GET /api/chargers/:id`-style) dispatching to per-domain handlers.
- `lib/mock/handlers/{auth,chargers,sessions,users,organizations,business,shop,misc,console}.ts`
  — the actual endpoint logic, deriving realistic responses from the seed
  data.
- `lib/mock/auth.ts` — fake JWT-like tokens (unsigned base64 JSON); any
  credentials succeed, persona picked by what was typed (see table above).

**2. Static export.** `lib/mock/browserIntercept.ts` hooks both `window.fetch`
and the app's axios instance so `/api/*` calls never leave the browser —
everything else (OSM tiles, Nominatim, Sentry) passes through untouched. With
that in place, the whole app builds with Next.js `output: 'export'`
(`next.config.ts`, gated on `STATIC_EXPORT=true`) and ships as plain
HTML/JS/CSS under the `/sana-cpms` basePath GitHub Pages project sites need.
That required removing `middleware.ts` (unsupported in static export, logic
moved client-side), adding `generateStaticParams` to every dynamic route
(sourced from the same seed data), and fixing up a handful of hardcoded
`/asset.png` paths to respect the basePath.

Maps use **MapLibre GL JS** + raw **OpenStreetMap** raster tiles, Nominatim
for geocoding, and OSRM for routing — no API keys required, unlike the
original Mapbox integration.

Deployment is automatic: `.github/workflows/deploy-pages.yml` builds the
static export and publishes it via `actions/deploy-pages` on every push to
`main`.

## Pages & features

The app is organized under `/<country>/...` (`rw` or `ke`), e.g.
`/rw/dashboard`, `/ke/console/stations`. There are two parallel authenticated
surfaces — an older role-scoped **Dashboard** and a newer unified **Console**
— plus a public marketing site.

### Public / marketing site
- **Home** (`/`) — landing page, redirects to `/rw`.
- **Charge map** (`/charge`) — public map of charging stations with search,
  directions, and station details, no login required.
- **Shop** (`/shop`, `/shop/[shopId]`, `/shop/[shopId]/order`) — browse and
  "order" EVs for sale.
- **Test drive** (`/testdrive`) — booking form (Airtable-backed originally).
- **Financing**, **Careers**, **Contact**, **FAQ**, **Testimonials**,
  **Forms**, **Kabisa Brochures**, **Vehicle Brochure**, **Charger Brochure**,
  **Passenger/Commercial Vehicles**, **Maintenance** — informational/marketing
  pages.
- **Blog** (`/blog/busting-ev-myths`, `/blog/evs-vs-hybrids`,
  `/blog/how-to-maintain-your-ev`) — static articles.
- **Highlights** (`/highlights`, `/highlights/[slug]`) — CMS-style content
  hub (no CMS in this demo; placeholder route only).

### Auth (`/auth/...`)
- **Login**, **Signup**, **Forgot password**, **Reset password** — fully
  mocked; see [Try it now](#try-it-now). Signup also auto-succeeds and logs
  you in as a fresh customer persona.

### Dashboard (`/dashboard/...`) — role-scoped, legacy surface
Redirects post-login based on role; each role sees a different subtree:
- **Admin** (`/dashboard/admin/...`) — sessions (incl. archive), chargers,
  organizations, businesses, individual vehicles, shop vehicles, users,
  countries, Kabisa IDs, vehicles-with-debt, shifts + shift reports,
  standalone proforma, and the full EBM tax-compliance suite (config, items,
  missing/failed EBM, PLU/sales/X-Z reports, VSDC init, codes sync).
- **Organization admin** (`/dashboard/org-admin/...`) — chargers, members,
  sessions, and shifts scoped to one organization.
- **Operator** (`/dashboard/operator/...`, `/dashboard/charge/...`) — shift
  start/end, charging session start/end, session history, shift swaps.
- **Customer** (`/dashboard/customer/...`) — vehicles, sessions, payment
  methods, entitlements, and business tools (create/manage a fleet business,
  team, invitations, contracts).
- **Shared** — profile, settings, scan (QR/plate lookup), invitations.

### Console (`/console/...`) — unified admin backoffice
A newer, permission-gated single surface that supersedes most of Dashboard's
admin views, organized into sidebar groups:
- **Infrastructure** — Stations, Sessions, Tags, Tariffs & Rates.
- **Business** — Revenue & Billing, Compliance.
- **EBM** — Proforma, Missing/Failed EBM, PLU Report, X/Z Reports, Sales
  Report (Rwanda RRA tax-receipt compliance workflows).
- **EBM Config** — EBM Configuration, EBM Items, CIS/VSDC Codes sync, VSDC
  Initialization.
- **People & Shifts** — Operators, Schedule, Shift Reports.
- **Fleet** (platform admin) — Vehicles, Shop Vehicles, Shop Orders,
  Vehicles with Debt, Businesses.
- **Platform Admin** — Organizations, Countries, Users, Audit Log, Citrine
  Sync (charger telemetry observability).
- **My Work** (operators) — Operator Dashboard, Check In/Out, Start/End
  Session, My Sessions.
- **Organization** — Settings (General, Billing & Plan, Team & Members,
  Roles & Permissions, Tax & EBM).
- **Account** — profile and active sessions.

Detail pages exist for individual stations, sessions, operators,
organizations, businesses, vehicles, and tags — each pre-rendered at build
time for every seeded entity via `generateStaticParams`.

## Countries

The demo covers **Rwanda (`rw`)** and **Kenya (`ke`)**; all seed data,
currency handling, and country-scoped routes are generated for both.

## Tech stack

- **Next.js 15** (App Router) + React + TypeScript
- **Tailwind CSS**
- **MapLibre GL JS** + OpenStreetMap (tiles, Nominatim geocoding, OSRM
  routing)
- **Sentry** (error monitoring, build-time source maps disabled in static
  export)
- Jest for tests

## Local development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — the mock backend runs inside the same Next.js
server process, dispatched through `lib/mock/router.ts`.

To build the same static export that ships to GitHub Pages:

```bash
STATIC_EXPORT=true npm run build
```

Output lands in `out/`; serve it with any static file server, mindful that
GitHub Pages serves it under the `/sana-cpms` subpath.

## Demo mode & caveats

- A **"DEMO" badge** in the bottom-right corner of every page explains the
  mock login and links back to this context.
- Data resets whenever the page is fully reloaded from a fresh session
  (in-memory store, not persisted to `localStorage`/a database).
- No real payments, SMS/OTP, email, AWS Rekognition (license-plate
  detection), Cloudflare uploads, or RRA/EBM tax-authority integration —
  those endpoints return realistic-looking mocked responses instead.
- `robots.txt` disallows all crawling — this is a demo deployment with fake
  data, not meant to be indexed.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy-pages.yml`, which:
1. Builds the static export (`STATIC_EXPORT=true npm run build`).
2. Uploads `out/` as a Pages artifact.
3. Deploys it via `actions/deploy-pages` to
   https://kevinhawkinsdesign.github.io/sana-cpms/.

This requires the repo's **Settings → Pages → Build and deployment → Source**
to be set to **GitHub Actions**, and the `github-pages` environment's
deployment-branch policy to allow `main`.
