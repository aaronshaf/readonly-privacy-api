import { describe, expect, it } from "vitest";
import { sanitizeCard, sanitizeCardsPayload } from "../../src/filters/cards";
import { sanitizeTransaction, sanitizeTransactionsPayload } from "../../src/filters/transactions";

describe("card filtering", () => {
  it("drops PAN/CVV/expiry fields", () => {
    const sanitized = sanitizeCard({
      token: "7ef7d65c-9023-4da3-b113-3b8583fd7951",
      last_four: "4142",
      pan: "4111111111111111",
      cvv: "123",
      exp_month: "06",
      exp_year: "2027",
      state: "OPEN"
    });

    expect(sanitized).toEqual({
      token: "7ef7d65c-9023-4da3-b113-3b8583fd7951",
      last_four: "4142",
      state: "OPEN"
    });
  });

  it("keeps pagination wrapper while filtering rows", () => {
    const sanitized = sanitizeCardsPayload({
      data: [
        {
          token: "7ef7d65c-9023-4da3-b113-3b8583fd7951",
          pan: "4111111111111111",
          cvv: "123"
        }
      ],
      has_more: false
    });

    expect(sanitized).toEqual({
      data: [{ token: "7ef7d65c-9023-4da3-b113-3b8583fd7951" }],
      has_more: false
    });
  });
});

describe("transaction filtering", () => {
  it("returns strict allowlisted transaction fields", () => {
    const sanitized = sanitizeTransaction({
      token: "764fa5a3-2371-40f0-8cbb-9a2e1230d955",
      result: "APPROVED",
      status: "SETTLING",
      amount: -7666,
      secret_note: "drop this"
    });

    expect(sanitized).toEqual({
      token: "764fa5a3-2371-40f0-8cbb-9a2e1230d955",
      result: "APPROVED",
      status: "SETTLING",
      amount: -7666
    });
  });

  it("keeps pagination wrapper while filtering rows", () => {
    const sanitized = sanitizeTransactionsPayload({
      data: [
        {
          token: "764fa5a3-2371-40f0-8cbb-9a2e1230d955",
          status: "SETTLING",
          secret_note: "drop this"
        }
      ],
      has_more: true
    });

    expect(sanitized).toEqual({
      data: [{ token: "764fa5a3-2371-40f0-8cbb-9a2e1230d955", status: "SETTLING" }],
      has_more: true
    });
  });
});
