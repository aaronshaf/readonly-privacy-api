# readonly-privacy-api

Cloudflare Worker proxy that exposes a read-only subset of the Privacy.com API.

- Protects API routes with `Authorization: Bearer <READONLY_PRIVACY_BEARER_TOKEN>`
- Strips sensitive card fields (`pan`, `cvv`, expiry)

Privacy API reference: https://privacy-com.readme.io/docs/getting-started

> **Known issue:** Requests from Cloudflare Workers to `api.privacy.com` are currently blocked with `403 Forbidden` at Privacy.com's AWS load balancer. This appears to be a block on Cloudflare's shared egress IP ranges. The worker is correctly configured — the same API key works fine from a regular machine. An email has been sent to Privacy.com's API team to investigate. Upstream calls will return `502` until this is resolved.

## Routes

- `GET /healthz` (public)
- `GET /openapi.json` (public)
- `GET /cards`
- `GET /cards/:token`
- `GET /transactions`
- `GET /transactions/:token` (disabled by default, returns `501` unless enabled)

## Easy Setup

1. Install deps:
   `bun install`
2. Create `.dev.vars` (local only, never commit):
   `PRIVACY_API_KEY=...`
   `READONLY_PRIVACY_BEARER_TOKEN=...`
3. Start local dev:
   `bun run dev`
4. Set deployed Worker secrets:
   `wrangler secret put PRIVACY_API_KEY`
   `wrangler secret put READONLY_PRIVACY_BEARER_TOKEN`
5. Deploy:
   `bun run deploy`

Optional: enable transaction token route:
- Set Worker var `ENABLE_TRANSACTION_TOKEN_ROUTE=true`

## Local Checks

- Type check: `bun run typecheck`
- Tests: `bun run test`
- TS/TSX line cap (600): `bun run check:lines:ts`

## Security Rules

- Never commit real keys, webhook dumps, PAN/CVV/expiry, or other private/censored data.
- Use Cloudflare secrets (`wrangler secret put`) for credentials.
