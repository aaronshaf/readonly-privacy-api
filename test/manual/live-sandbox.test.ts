import { readFileSync } from "fs";
import { join } from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { Schema } from "effect";
import { PrivacyClient } from "../../src/privacy-client";
import { sanitizeCardsPayload } from "../../src/filters/cards";
import { sanitizeTransactionsPayload } from "../../src/filters/transactions";

const SANDBOX_BASE_URL = "https://sandbox.privacy.com/v1";

function loadDevVars(): Record<string, string> {
  const path = join(process.cwd(), ".dev.vars");
  const contents = readFileSync(path, "utf-8");
  const vars: Record<string, string> = {};
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

const SanitizedCard = Schema.Struct({
  token: Schema.String,
  state: Schema.String
});

const SanitizedCardsListResponse = Schema.Struct({
  data: Schema.Array(SanitizedCard),
  has_more: Schema.Boolean
});

const SanitizedTransaction = Schema.Struct({
  token: Schema.String,
  status: Schema.String
});

const SanitizedTransactionsListResponse = Schema.Struct({
  data: Schema.Array(SanitizedTransaction),
  has_more: Schema.Boolean
});

const SENSITIVE_CARD_FIELDS = ["pan", "cvv", "exp_month", "exp_year"];

describe.runIf(process.env["RUN_SANDBOX_TESTS"] === "true")("live sandbox", () => {
  let client: PrivacyClient;

  beforeEach(() => {
    const vars = loadDevVars();
    const apiKey = vars["PRIVACY_API_KEY"];
    if (!apiKey) throw new Error("PRIVACY_API_KEY not found in .dev.vars");
    client = new PrivacyClient({ apiKey, baseUrl: SANDBOX_BASE_URL });
  });

  it("GET /cards returns sanitized list with no sensitive fields", async () => {
    const raw = await client.get("/cards");
    const sanitized = sanitizeCardsPayload(raw);

    const decoded = Schema.decodeUnknownSync(SanitizedCardsListResponse)(sanitized);
    expect(decoded.data.length).toBeGreaterThanOrEqual(0);

    for (const card of decoded.data) {
      for (const field of SENSITIVE_CARD_FIELDS) {
        expect(card).not.toHaveProperty(field);
      }
    }
  });

  it("GET /transactions returns sanitized list with no sensitive fields", async () => {
    const raw = await client.get("/transaction");
    const sanitized = sanitizeTransactionsPayload(raw);

    const decoded = Schema.decodeUnknownSync(SanitizedTransactionsListResponse)(sanitized);
    expect(decoded.data.length).toBeGreaterThanOrEqual(0);

    for (const tx of decoded.data) {
      expect(tx).not.toHaveProperty("pan");
    }
  });
});
