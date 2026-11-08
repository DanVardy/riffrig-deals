# RiffRig Deals runbook

Nothing in this runbook has been deployed, purchased, or emailed. Public launch and spending need Danny Vardy’s later approval.

## Stack

- Next.js standalone server, Docker image, Railway app service.
- Railway Postgres via `DATABASE_URL`. Set `DATABASE_SSL=require` for a public URL that needs TLS. Certificate checks stay on.
- Leadmail for the Friday letter, disabled until the gates below are confirmed.
- Not Vercel. Not Resend.

## Local preview

`npm run dev` reads `data/catalogue.json` and does not write. The yellow banner says so. Forms return “Not saved” rather than a fake success.

`npm run build && npm start` with production env and no `DATABASE_URL` returns 503 for pages and APIs.

## First real database

1. Create the Railway project, app service, and Postgres yourself when you are ready. This workspace did not.
2. Set `DATABASE_URL`, `DATABASE_SSL`, `ADMIN_TOKEN`, and `UNSUBSCRIBE_SECRET`. Tokens must be at least 16 characters. Generate them locally. Never prefix them with `NEXT_PUBLIC`.
3. Set `NEXT_PUBLIC_SITE_URL` to the public origin before building, so canonical links and the sitemap match.
4. `npm run release` migrates, then inserts catalogue rows that are not already there. `npm start` does the same release before it listens, so a pre-deploy that only migrates still loads the catalogue on boot.
5. Seed uses `ON CONFLICT (slug) DO NOTHING`. It does not update an existing entry, and it does not write signups, submissions, enquiries, sponsors, or error rows. A second release logs `inserted: 0` and the same `databaseMatches` count. The process exits non-zero if the database does not contain every catalogue slug.

`npm start` runs `scripts/serve.mjs`. When `DATABASE_URL` is set it runs `npm run release` and exits if that fails. It then starts `node .next/standalone/server.js`, which is the server Next builds for `output: "standalone"`. The previous starter called `next()` directly, and Next logs that path as incompatible with standalone. With no `DATABASE_URL`, startup skips the release and the app still fail-closes. Health is fully ready only when the database URL, admin token, and unsubscribe secret are all set. The health body does not list secret values. Railway’s health check stays on `/api/health`, so a deploy without the database does not go ready.

`railway.toml` asks for the Dockerfile builder, `preDeployCommand = ["npm run release"]`, and `startCommand = "npm run start"`. Railway’s docs say config-as-code overrides the dashboard only when that file is applied, and new services cannot opt into config-as-code. The preview that was already deployed was built with Railpack, so this file was not what that deployment used. If a later deploy still ignores the file, set the service start command to `npm run start` and the pre-deploy command to `npm run release`. Do not start it with `next start`.

## Admin API

Send `Authorization: Bearer <ADMIN_TOKEN>`. A missing token is 503. A wrong token is 401. Query-string tokens are rejected. Comparison hashes both values before a constant-time check.

- `GET /api/admin/queue` pending submissions. Notes are the submitter’s words, not published prices.
- `POST /api/admin/approve` with `{ "id", "decision": "approve" | "reject" }`. Approval creates a catalogue row with an unverified price and `activeDeal: false`. It does not copy the note into the public summary.
- `GET /api/admin/stats` counts only. No email addresses.
- `GET /api/admin/searches` zero-result search totals. Address-shaped queries are not stored.
- `GET /api/admin/sponsors` sponsors, sold weeks, click totals, and the A$25 introductory offer.

Publish a checked price with `POST /api/admin/entries/update`. Do not edit price columns by hand. The token is `Authorization: Bearer <ADMIN_TOKEN>` and is never a query parameter. A missing or wrong token is 401 when the token is configured, and 503 when it is not. The body may only contain the fields below. Slug, id, name, and every other column are left unchanged.

```json
{
  "slug": "example-plugin",
  "kind": "verified_sale",
  "currency": "EUR",
  "saleAmount": 29.99,
  "listAmount": 199.99,
  "expiryUnknown": true,
  "checkedAt": "2026-11-08T01:51:00.000Z",
  "sourceUrl": "https://example.com/product",
  "sourceNote": "Vendor page shows the sale and the regular price. No end date is stated.",
  "expectedUpdatedAt": "optional, from the previous response"
}
```

`kind` is `verified_list`, `verified_sale`, `clear_sale`, or `clear_price`.

- `verified_list` requires `currency`, `listAmount`, `checkedAt`, `sourceUrl`, and `sourceNote`. It is not a sale.
- `verified_sale` requires `currency`, `saleAmount`, `checkedAt`, `sourceUrl`, `sourceNote`, and either `expiryUnknown: true` or `expiresAt`. `listAmount` is optional and must use the same currency. The sale amount must be lower than the list amount when both are sent. A missing end date is stored as expiry unknown and shown that way.
- `clear_sale` removes the deal. A list price already stored on the row stays a list price. Send no amounts.
- `clear_price` removes the published price and the deal.

Amounts must be finite and positive, with at most two decimal places. `currency` must be an ISO code the server allows (`USD`, `EUR`, `GBP`, `AUD`, `CAD`, `NZD`, `CHF`, `SEK`, `NOK`, `DKK`, `JPY`), not a symbol. `checkedAt` must not be in the future. `sourceNote` must describe what was on the page and must not claim a historic low. `sourceUrl` must be the public https page that was read.

A 200 response is `{ "ok": true, "entry": { slug, name, priceStatus, listAmount, listCurrency, saleAmount, saleCurrency, expiresAt, expiryUnknown, activeDeal, checkedAt, sourceUrl, sourceNote, updatedAt } }`. Unknown slug is 404. A stale `expectedUpdatedAt` is 409. Malformed input is 400 with `error: "invalid"` and a short `message`.

Publish one slug at a time. Save `updatedAt` and send it as `expectedUpdatedAt` if you correct that row. Run `npm run release` afterwards if you want; it inserts missing catalogue rows only and does not overwrite this update or any signup. Do not publish a price from an unchecked note, and do not send a `checkedAt` later than the moment you saw the page.

## Catalogue research, 8 Nov 2026 AWST

Starter notes covered 37 candidates, including vendor homepages. Those homepages are not products and are not in the catalogue: Ignite Amps, Audio Assault, Joey Sturgis Tones, TONE3000, York Audio, and Two Notes GENOME (the page was blocked). Mercuriall’s site did not respond cleanly and was left out.

The seeded catalogue has 39 individual official pages: Neural DSP plugins, other amp sims, NAM and TONEX, effects, five OwnHammer IR libraries, REAPER, and Audacity. Operating systems and plugin formats were not verified and stay null.

Discarded, not shown as prices:

- AmpliTube 5 structured data EUR 29.99. Not confirmed as list or sale.
- TONEX structured data EUR 199.99. The live title is TONEX 2 while the path is still `/products/tonex/`. The row is named TONEX 2 and has no price.
- Universal Audio Paradise Guitar Studio structured data USD 199. Not confirmed.
- ValhallaRoom structured data was a bare 50 with no currency. A repeat fetch was blocked.

Kept:

- REAPER’s purchase page states a USD $60 discounted licence and a USD $225 commercial licence. That is a licence class, not a temporary sale.
- Neural Amp Modeler and Audacity say they are free in their official titles.

OwnHammer pages were reachable. Their price text was mixed with sale and sold-out labels, so those numbers are not shown.

## Leadmail gate

Docs: https://app.leadmail.ai/docs

Known from that page: `X-API-Key`, `POST /api/contacts/create`, `POST /api/lists/remove-contact`, `POST /api/lists/remove-contact-all`, and `POST /api/contacts/unsubscribe` (the example sets `doNotDisturb`). The add-contact example is a POST to `/api/lists/add-contact` with `email` and `listId`, but the heading does not state the method. Every example host is the broken string `https:///api`.

Not verified, and not implemented: broadcast sending, scheduling, suppression actually sticking, one-click `List-Unsubscribe` headers, bounces, and rate limits.

The adapter stays off unless all of these are set:

- `LEADMAIL_API_BASE` is an https origin you have confirmed. Do not guess one.
- `LEADMAIL_API_KEY` and `LEADMAIL_LIST_ID`
- `LEADMAIL_SENDING_VERIFIED=true` only after you have confirmed the host, the add-contact method, and that creating a contact does not send the Friday letter by itself.

Until that flag is true, signup stores a pending row and does not call Leadmail. A pending row is not a subscription. An unsubscribed address is never sent back to the list automatically. Unsubscribe tokens are HMAC-signed and are not issued for an email typed into a form. The letter template is `lib/newsletter.ts`. It is not wired to a send call. A sponsor line is included only when that week is sold.

## Sponsors and clicks

Introductory offer: A$25 per week for a labelled site line and a Friday line in a sold week. The sponsor page shows “unavailable” in the preview and measured totals (including honest zeros) once Postgres is connected. `/go/<slug>` redirects only to the stored https URL of the sponsor with a sold week covering today, then adds to the daily click total. It ignores any `url` query parameter.

## Search indexing

Prelaunch default: crawlers are blocked. `ALLOW_SEARCH_INDEXING` must be the exact string `true` before that changes. Set it in the environment used for `npm run build` (so the `X-Robots-Tag` header is omitted) and in the running process (so page metadata and `/robots.txt` allow indexing). Any other value, including empty, keeps `noindex, nofollow`, a robots file that disallows `/`, and the header. CI sets the flag to `false` and does not index anything.

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests and on pushes to `main`. It checks out the repo, installs with `npm ci` on Node 22, then runs lint, typecheck, tests, and the production build. Permissions are `contents: read`. No `DATABASE_URL`, admin token, unsubscribe secret, or Leadmail key is required. During `next build`, Next sets `NEXT_PHASE=phase-production-build`, and the app treats that phase as the preview catalogue when Postgres is not configured.

## Still closed

- No Railway project, database, domain, or variables were created.
- No Leadmail account, list, or send.
- No affiliate program was joined and no affiliate URL is stored.
- No sponsor week is sold.
- Do not announce the Friday letter as live.
