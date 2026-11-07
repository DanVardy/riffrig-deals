# RiffRig Deals

Cross-genre guitar plugin tracker for amp sims, effects, cabinet IRs, and recording tools. Metal is a filter, not the audience. A Friday letter with five picks, and later a labelled sponsor or affiliate slot, sit beside the catalogue.

This repo is a Next.js app meant to run on Railway with Postgres. Email, when it is eventually switched on, goes through Leadmail. It does not target Vercel or Resend.

## Honest catalogue rules

- A price is shown only when it was read on the vendor’s own page and the currency is clear.
- A temporary sale is listed only when that sale price was confirmed on the vendor page.
- A confirmed sale with no published end date is eligible. It is labelled **expiry unknown**. An end date is not required.
- Machine-read prices that were not confirmed are not shown. See the runbook for the discarded extractions.
- There are no affiliate links and no booked sponsor. Paid placements must be labelled Sponsored.
- Descriptions are original. Vendor logos and product art are not used.

`npm run dev` is a database-less preview: the catalogue renders, and the banner says submissions, signups, and enquiries are not saved. Production without `DATABASE_URL` fails closed instead of pretending those writes succeeded.

Search indexing is off until `ALLOW_SEARCH_INDEXING=true`. That flag has to be set for the production build and for the running process. Until then, pages send `noindex`, `/robots.txt` disallows the site, and responses include `X-Robots-Tag: noindex, nofollow`.

GitHub Actions (`.github/workflows/ci.yml`) runs `npm ci`, then lint, typecheck, tests, and `npm run build` on pull requests and pushes to `main`. The build does not need a database or any secret: `next build` sets `NEXT_PHASE=phase-production-build`, so a missing `DATABASE_URL` stays on the preview catalogue.

## Scripts

```bash
npm install
npm run dev          # preview on port 3000
npm test
npm run lint
npm run typecheck
npm run build
npm run migrate      # needs DATABASE_URL
npm run seed         # needs DATABASE_URL; re-seed resets deal flags from data/catalogue.json
```

Environment placeholders live in `.env.example`. Do not commit real tokens.

Public launch, Railway provisioning, and any spend need the owner’s later approval. Deployment gates are in `RUNBOOK.md`.
