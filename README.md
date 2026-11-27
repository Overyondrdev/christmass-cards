# Yondr Christmas Cards

[![CI](https://github.com/Overyondrdev/christmass-cards/actions/workflows/ci.yml/badge.svg)](https://github.com/Overyondrdev/christmass-cards/actions/workflows/ci.yml)

**https://cards.overyondrdev.com**: Yondr staff add the clients who should receive a Christmas card.
The card team sees everything at **/admin**. Everyone signs in with their `@overyondr.com` Google account, so we
always know who added each client.

One Cloudflare Worker (`yondr-christmas-cards`) with its own D1 database (`yondr-christmas-cards`). It used to live
in `apps/christmas-cards/` of [overyondr-website-v1](https://github.com/Overyondrdev/overyondr-website-v1); this
repo is now the only source.

## How changes ship
1. Branch from `main`, make the change, run `npm run verify` (syntax, tests, Worker bundle).
2. Open a pull request. CI must pass.
3. Merge. **Cloudflare Workers Builds deploys `main` automatically**, usually within a minute.
4. Check https://cards.overyondrdev.com.

Never commit `.dev.vars`, `.env*` or keys. Database changes must be additive (see `src/schema.js`).

## Sign-in (`src/index.js`, `src/auth.js`, `src/yondr-session.js`)
- Every page that needs a person sends them to `/auth`. If they aren't signed in, `/auth` sends them to the shared
  Yondr Google sign-in at **auth.overyondrdev.com**, which returns them with the `yondr_session` cookie
  (`.overyondrdev.com`, ES256-signed). `/auth` then starts the app's own 30-day session cookie.
- `src/yondr-session.js` verifies that cookie with the public key in `YONDR_AUTH_PUBLIC_JWK` (safe to commit). It
  **must stay identical** to `auth/src/session.js` in overyondr-website-v1; CI checks this on every run and weekly.
- Cloudflare Access: both Access applications for this host (`cards.overyondrdev.com` and
  `cards.overyondrdev.com/auth`) are **Bypass**; the app does its own checks. `src/auth.js` still accepts an Access
  token (`ACCESS_AUD`) and `src/signin.js` still has an email-code sign-in, as fallbacks that are not used today.
- Only `@overyondr.com` accounts are accepted (`ALLOWED_EMAIL_DOMAINS`).

## What it does
- **First-visit guide**: three short steps (welcome, how to add clients, then a choice to download the address
  spreadsheet, upload one, or add a client by hand). Shown once per person (tracked in D1) and again from
  *See how it works*.
- **Address spreadsheet** (`public/yondr-christmas-card-list.xlsx`): a styled Excel file with required columns in
  Dark Green, dropdowns for Country (US, UK, Mexico first) and Department, a text-formatted ZIP column and a
  "How to fill this in" tab. Rebuild it with `python3 scripts/make-template.py` (needs openpyxl) whenever the
  department list changes, so its dropdown matches.
- **Google Sheets option**: every *Download Excel* button has an *Open in Google Sheets* button next to it. It opens
  `docs.google.com/spreadsheets/d/<id>/copy` for a view-only, locked master in Chad's Google Drive ("Yondr Christmas
  card list (template – make a copy)"), so each person gets their own private copy and lists never mix. They then
  download it as Excel and upload it, or paste the cells. If the spreadsheet changes, upload the new .xlsx to Drive
  as a Google Sheet, share it view-only by link, lock it, and update `SHEETS_COPY_URL` in `public/app.js` and the
  link in `public/index.html`.
- **Required for every client**: name, organization, street address, city, postal code, country (state/region for
  the US, Mexico, Canada and Australia), plus the sender's department. Country has no preselected value; US, UK
  and Mexico are listed first.
- **Add one client** — the person's department (dropdown, remembered for next time), then a form with an address check before saving. If the address looks wrong we show what
  we'd change (highlighted) with *Use suggested* / *Keep mine*; problems we can't fix are listed with *Save anyway*.
- **Upload a list** — `.xlsx`, `.csv`, or cells pasted from a spreadsheet. Columns are matched automatically
  (first + last name columns are combined), every address is checked, duplicates are flagged, then
  people review suggestions before adding.
- **Your clients** — everyone sees and edits only what they added.
- **Admin** (`/admin`) — totals, who added what, every client with filters, uploads, CSV export for the mail
  house, mark flagged addresses as checked, admins, and settings (deadline, intro message, department list,
  close the list). Department is a column, a filter and an overview chart.

## Address checking (`src/address.js`)
1. Built-in rules always run: required fields, postal-code formats (US, CA, UK, MX and ~25 more), US state/ZIP
   agreement, Canadian provinces, plus safe clean-ups (state names → codes, lost ZIP leading zeros, postcode spacing).
2. Free lookups, no account or key:
   - **US**: the US Census Bureau geocoder (`geocoding.geo.census.gov`) matches the building number against official
     street address ranges and suggests the corrected street, city, state and ZIP. It retries with just the ZIP, and
     with the state the ZIP belongs to, so a wrong city or state still finds the address.
   - **Everywhere else**: OpenStreetMap Nominatim (`nominatim.openstreetmap.org`) finds the street or building and
     suggests the right postal code. If the street isn't mapped, it still checks the postal code belongs to the city.
     Nominatim's rules: at most 1 request a second (calls are queued ~1.1 s apart), an identifying User-Agent, and
     attribution ("© OpenStreetMap contributors" in the page footer and on check results).
   - These confirm an address exists. They can't confirm mail delivery or suite numbers the way USPS can.
   Results are cached in D1 for 60 days, so re-checking the same address costs nothing.
3. Optional: if the Worker secret `GOOGLE_MAPS_API_KEY` is ever set (Google Address Validation API, with USPS data
   for US addresses), Google is used instead of the free lookups.

## Run locally
```sh
nvm use                      # Node 22
npm ci
echo 'DEV_EMAIL="you@overyondr.com"' > .dev.vars     # signs you in locally; never set in production
npm run dev                  # http://localhost:8787
npx wrangler d1 execute yondr-christmas-cards --local --command \
  "INSERT INTO admins (email, role, added_at) VALUES ('you@overyondr.com', 'owner', datetime('now'))"
```
`npm test` runs the unit tests; `npm run verify` runs everything CI runs.

## Deploying
- **Normal path:** merge to `main`. Workers Builds (Cloudflare dashboard → Workers & Pages → yondr-christmas-cards →
  Settings → Builds) runs `npm ci`, `npm run build` and `npx wrangler deploy` from the repo root.
- **Emergency / manual:** `npx wrangler deploy` from a clean checkout of `main` (needs Cloudflare access).
- **Roll back:** dashboard → yondr-christmas-cards → Deployments → pick the previous version → *Deploy*, or
  `npx wrangler rollback`.
- The database schema is applied automatically on the first request. Settings, admins and clients live in D1 and are
  unaffected by deploys.
- Secrets: none today. `GOOGLE_MAPS_API_KEY` is optional (Worker secret, set in the dashboard).

## Files
| Path | What |
| --- | --- |
| `src/index.js` | Worker entry: `/auth`, `/api/*`, and the bundled pages in `public/` |
| `src/api.js` | JSON API (clients, bulk check/save, admin) |
| `src/address.js` | Address rules, Census / OpenStreetMap lookups, optional Google |
| `src/auth.js` | Who is signed in (Yondr session, then fallbacks) |
| `src/yondr-session.js` | Shared Yondr sign-in cookie check (copy of the auth service's `session.js`) |
| `src/signin.js` | App session cookie, plus the unused email-code fallback |
| `src/schema.js` / `schema.sql` | D1 tables (applied automatically) |
| `public/` | Pages, scripts, styles, fonts, brand files and the address spreadsheet (bundled by `scripts/bundle.mjs`) |
| `scripts/make-template.py` | Rebuilds `public/yondr-christmas-card-list.xlsx` (needs openpyxl) |
| `test/` | Unit tests (`node --test`) |
