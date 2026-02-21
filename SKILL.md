# readonly-privacy-api — Agent Skill Reference

This is a read-only proxy for the [Privacy.com](https://privacy.com) API, deployed as a Cloudflare Worker. It exposes virtual card and transaction data with sensitive fields stripped. Agents and bots can use this to read card and transaction information safely.

Base URL: `https://your-worker.workers.dev`

---

## Authentication

All routes except `/healthz` and `/SKILL.md` require a bearer token:

```
Authorization: Bearer <WORKER_API_TOKEN>
```

Requests without a valid token return `401 Unauthorized`.

---

## Routes

### `GET /healthz`
Public. Returns service health status.

**Response:**
```json
{ "status": "ok", "service": "readonly-privacy-api" }
```

---

### `GET /SKILL.md`
Public. Returns this document as plain text Markdown.

---

### `GET /cards`
List virtual cards. Sensitive fields (`pan`, `cvv`, expiry) are stripped.

**Query parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page_size` | integer (1–1000) | Number of results per page |
| `starting_after` | UUID v4 | Cursor for pagination (token of last card seen) |
| `begin` | date (`YYYY-MM-DD`) | Filter cards created on or after this date |
| `end` | date (`YYYY-MM-DD`) | Filter cards created on or before this date |
| `account_token` | UUID v4 | Filter by account |

**Response:**
```json
{
  "data": [
    {
      "token": "7ef7d65c-9023-4da3-b113-3b8583fd7951",
      "created": "2024-01-15T10:30:00Z",
      "last_four": "4242",
      "hostname": "netflix.com",
      "memo": "Netflix subscription",
      "type": "MERCHANT_LOCKED",
      "spend_limit": 2000,
      "spend_limit_duration": "MONTHLY",
      "state": "OPEN",
      "funding": {
        "token": "...",
        "type": "DEPOSITORY_CHECKING",
        "state": "ENABLED",
        "last_four": "1234"
      },
      "auth_rule_tokens": []
    }
  ],
  "has_more": false
}
```

**Card `state` values:** `OPEN`, `PAUSED`, `CLOSED`
**Card `type` values:** `SINGLE_USE`, `MERCHANT_LOCKED`, `UNLOCKED`, `PHYSICAL`

---

### `GET /cards/:token`
Get a single card by its UUID token. Same field allowlist as list route.

**Example:** `GET /cards/7ef7d65c-9023-4da3-b113-3b8583fd7951`

---

### `GET /transactions`
List transactions. No PAN or sensitive card data is exposed.

**Query parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page_size` | integer (1–1000) | Number of results per page |
| `starting_after` | UUID v4 | Cursor for pagination (token of last transaction seen) |
| `begin` | date (`YYYY-MM-DD`) | Filter transactions on or after this date |
| `end` | date (`YYYY-MM-DD`) | Filter transactions on or before this date |
| `card_token` | UUID v4 | Filter by card |
| `account_token` | UUID v4 | Filter by account |
| `result` | `APPROVED` or `DECLINED` | Filter by authorization result |

**Response:**
```json
{
  "data": [
    {
      "token": "764fa5a3-2371-40f0-8cbb-9a2e1230d955",
      "created": "2024-01-15T10:30:00Z",
      "card_token": "7ef7d65c-9023-4da3-b113-3b8583fd7951",
      "amount": 1999,
      "authorization_amount": 1999,
      "settled_amount": 1999,
      "merchant_amount": 1999,
      "merchant_currency": "USD",
      "result": "APPROVED",
      "status": "SETTLED",
      "authorization_code": "ABC123",
      "merchant": {
        "descriptor": "NETFLIX.COM",
        "city": "Los Gatos",
        "state": "CA",
        "country": "USA",
        "mcc": "7841",
        "acceptor_id": "123456789"
      },
      "events": [
        {
          "token": "...",
          "amount": 1999,
          "result": "APPROVED",
          "type": "AUTHORIZATION",
          "created": "2024-01-15T10:30:00Z"
        }
      ],
      "funding": [
        { "token": "...", "amount": 1999, "type": "DEPOSITORY_CHECKING" }
      ]
    }
  ],
  "has_more": false
}
```

**Transaction `status` values:** `PENDING`, `VOIDED`, `SETTLING`, `SETTLED`, `BOUNCED`
**Transaction `result` values:** `APPROVED`, `DECLINED`

**Amounts** are in cents (integer). `1999` = $19.99 USD.

---

### `GET /transactions/:token`
Get a single transaction by UUID. **Disabled by default** — returns `501` unless the worker is configured with `ENABLE_TRANSACTION_TOKEN_ROUTE=true`.

---

### `POST /webhooks/privacy`
Receive Privacy.com transaction webhooks. Verifies `X-Privacy-HMAC` signature using HMAC-SHA256 over stable-stringified JSON. Returns `200` on success, `401` on invalid signature.

This route does **not** require the `Authorization` bearer token.

---

## Pagination

All list routes use cursor-based pagination:

1. Fetch first page: `GET /cards?page_size=50`
2. If `has_more` is `true`, fetch next page using the `token` of the last item:
   `GET /cards?page_size=50&starting_after=<last-token>`
3. Repeat until `has_more` is `false`

---

## Error Responses

All errors return JSON in this shape:

```json
{ "error": { "code": "unauthorized", "message": "Missing or invalid bearer token." } }
```

| Status | Code | Meaning |
|--------|------|---------|
| 400 | `bad_request` | Invalid query parameter or malformed token |
| 401 | `unauthorized` | Missing or invalid bearer token |
| 404 | `not_found` | Route not found |
| 405 | `method_not_allowed` | Wrong HTTP method |
| 500 | `misconfigured_worker` | Worker secrets not configured |
| 501 | `not_implemented` | Route disabled |
| 502/504 | `upstream_error` | Privacy.com API unreachable or timed out |

---

## Notes for Agents

- All amounts are **integers in cents**. Divide by 100 for display.
- `token` fields are UUID v4 strings — use them as stable identifiers.
- Cards with `state: "PAUSED"` or `state: "CLOSED"` cannot be charged.
- `spend_limit: 0` means no limit.
- `spend_limit_duration` values: `TRANSACTION`, `MONTHLY`, `ANNUALLY`, `FOREVER`
- The proxy never exposes full card numbers, CVV, or expiry dates.
