# Yondr Christmas Cards: instructions for Claude

**Start with the [overyondrdev.com Handbook](https://github.com/Overyondrdev/overyondr-website-v1/blob/main/docs/handbook/README.md)**:
the single source of truth for the whole platform (what runs where, sign-in without Cloudflare seats, portals, people
directory, operations, auto-fix, how we work, runbooks, decisions). If your change alters what it says, update it in
the same work (a PR in overyondr-website-v1).

cards.overyondrdev.com, one Cloudflare Worker (`yondr-christmas-cards`) with D1 `yondr-christmas-cards`.
Staff add the clients who should get a Yondr Christmas card; the card team works at `/admin`. It's live and in use:
avoid anything that would sign people out, lose data or change who can sign in, unless asked.

## How to ship a change
1. Branch from `main` (`fix/<thing>`, `feature/<thing>`, `content/<thing>`).
2. `npm ci` (first time), make the change, then `npm run verify`. It must pass.
3. Commit, push, open a PR using `.github/pull_request_template.md`. Wait for CI.
4. Merging to `main` deploys automatically (Cloudflare Workers Builds). Check https://cards.overyondrdev.com.
Never force-push `main`. Never commit `.dev.vars`, `.env*`, keys or client data.

## Rules
- `src/yondr-session.js` is a copy of overyondr-website-v1 `auth/src/session.js`. Never edit it here; copy the
  upstream file unchanged (CI fails if they differ).
- Person fields (Yondr staff: admins, "Added by") use the shared directory picker (overyondr-website-v1
  docs/PLATFORM.md §8). Client name/email fields are customers, not staff: no picker.
- Database: only additive changes (new tables, new nullable columns via `ADDED_COLUMNS` in `src/schema.js`). Then run
  `npm run schema` to regenerate `schema.sql` (a test fails if it's out of date).
- Static files in `public/` are bundled into the Worker by `scripts/bundle.mjs` (wrangler runs it before dev/deploy).
  Add new file types to its `TYPES` map.
- The address spreadsheet: edit `scripts/make-template.py`, run `npm run template`, commit the .xlsx, and replace the
  Google Sheets master (README → Google Sheets option).
- OpenStreetMap lookups: keep ≤ 1 request/second, the identifying User-Agent, and the attribution.
- Follow the Yondr Brand Guidelines (Fraunces + Inter Tight, Dark Green / Lichen / Off-White). Keep pages accessible
  and working at 375px wide. Ask before adding a dependency.

## Local dev
`DEV_EMAIL="you@overyondr.com"` in `.dev.vars` signs you in without Google. `npm run dev`, then open
http://localhost:8787. Make yourself an admin with the `wrangler d1 execute --local` command in the README.
