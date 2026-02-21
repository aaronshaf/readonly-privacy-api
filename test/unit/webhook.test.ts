import { describe, expect, it } from "vitest";
import {
  computePrivacyWebhookHmac,
  stableStringify,
  verifyPrivacyWebhookHmac
} from "../../src/webhook";

describe("stableStringify", () => {
  it("sorts object keys recursively", () => {
    const payload = {
      b: 1,
      a: {
        d: 3,
        c: 2
      }
    };

    expect(stableStringify(payload)).toBe('{"a":{"c":2,"d":3},"b":1}');
  });

  it("uses deterministic code-point key ordering", () => {
    const payload = {
      a: 1,
      Z: 2
    };

    expect(stableStringify(payload)).toBe('{"Z":2,"a":1}');
  });
});

describe("verifyPrivacyWebhookHmac", () => {
  it("accepts a valid signature", async () => {
    const secret = "privacy-secret";
    const payload = { token: "abc", status: "SETTLED" };
    const signature = await computePrivacyWebhookHmac(secret, payload);

    await expect(verifyPrivacyWebhookHmac(secret, payload, signature)).resolves.toBe(true);
  });

  it("rejects an invalid signature", async () => {
    const secret = "privacy-secret";
    const payload = { token: "abc", status: "SETTLED" };

    await expect(verifyPrivacyWebhookHmac(secret, payload, "invalid")).resolves.toBe(false);
  });
});
