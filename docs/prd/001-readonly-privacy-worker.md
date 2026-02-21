# PRD 001: Read-Only Privacy Worker

## Goal
Provide a secure Cloudflare Worker API that exposes a read-only subset of Privacy.com for internal consumers.

## Success Criteria
- Worker supports read-only cards and transactions routes.
- Worker token auth required on protected routes.
- Webhook endpoint verifies `X-Privacy-HMAC`.
- Sensitive card fields are never returned.
- No secrets/private data are committed.

## Users
- Internal services needing read-only Privacy API access.
- Operations systems receiving transaction lifecycle webhooks.

## In Scope
- `GET /cards`, `GET /cards/:token`
- `GET /transactions`, `GET /transactions/:token` (disabled by default)
- `POST /webhooks/privacy`
- `GET /healthz`
- Bun+TypeScript codebase, tests, pre-commit checks, pre-merge CI

## Out of Scope
- Any write operations to Privacy API.
- Persisting webhook payloads.
- Multi-tenant auth models.
- Custom edge rate limiting in v1.

## Security Requirements
- Inbound API auth: `Authorization: Bearer <WORKER_API_TOKEN>`.
- Upstream auth: `Authorization: api-key <PRIVACY_API_KEY>`.
- Webhook authenticity: HMAC verification required.
- Response allowlist filters unknown/sensitive fields.
- CI includes secret scanning.

## Acceptance
- All routes and controls implemented with tests.
- README contains setup and Privacy docs link.
- PR checks block merge on failing typecheck/tests/line limits/secrets.
