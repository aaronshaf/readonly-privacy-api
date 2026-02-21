# ADR 001: Worker Architecture and Security Baseline

## Status
Accepted

## Context
A Cloudflare Worker is needed to expose a controlled, read-only subset of Privacy.com API endpoints. The repository must avoid leaking secrets/private data.

## Decisions
- Runtime/tooling: Bun + TypeScript + Effect JS (including Effect Schema for validation).
- Public API paths: unversioned (`/cards`, `/transactions`, etc.).
- Auth for protected endpoints: `Authorization: Bearer <READONLY_PRIVACY_BEARER_TOKEN>`.
- Upstream Privacy credentials: `PRIVACY_API_KEY` secret only.
- Webhook endpoint: `POST /webhooks/privacy` with HMAC verification via `X-Privacy-HMAC`.
- Response policy: strict allowlist transforms; unknown fields dropped.
- Card data policy: always remove `pan`, `cvv`, `exp_month`, `exp_year`.
- Webhook processing: no persistence; return `200` on valid signature.
- `GET /transactions/:token`: present, but disabled by default (returns `501`) unless explicitly enabled.
- Deployment: production-only initial environment.

## Consequences
- Reduced accidental data exposure risk.
- Cleaner change management as upstream payloads evolve.
- Requires explicit secrets setup and signature handling.
- Transaction-by-token support needs explicit operator opt-in.

## Guardrails
- Husky pre-commit runs TypeScript check and `.ts/.tsx` line cap (600).
- GitHub Actions pre-merge runs typecheck, tests, TS line cap, and gitleaks secret scan.
