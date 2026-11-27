## What changed

## Why

## Checks
- [ ] `npm run verify` passes (syntax, tests, Worker bundle)
- [ ] Tried it with `npm run dev` on desktop and at 375px wide
- [ ] No change to who can sign in, or the change is described above
- [ ] Database changes are additive (new tables/columns via `src/schema.js`), never destructive

After merge, Cloudflare deploys `main` automatically. Check https://cards.overyondrdev.com.
