import { describe, expect, it } from "vitest";
import { buildCardsQuery, buildTransactionsQuery, validateTokenPathParam } from "../../src/query";
import { RequestValidationError } from "../../src/errors";

describe("validateTokenPathParam", () => {
  it("accepts a valid UUID v4", () => {
    expect(() => validateTokenPathParam("7ef7d65c-9023-4da3-b113-3b8583fd7951", "card_token")).not.toThrow();
  });

  it("rejects a non-UUID string", () => {
    expect(() => validateTokenPathParam("not-a-uuid", "card_token")).toThrow(RequestValidationError);
  });

  it("rejects a UUID v1", () => {
    expect(() => validateTokenPathParam("550e8400-e29b-11d4-a716-446655440000", "card_token")).toThrow(
      RequestValidationError
    );
  });
});

describe("buildCardsQuery", () => {
  it("returns empty string for no params", () => {
    expect(buildCardsQuery(new URLSearchParams())).toBe("");
  });

  it("passes through valid page_size", () => {
    expect(buildCardsQuery(new URLSearchParams("page_size=50"))).toBe("?page_size=50");
  });

  it("passes through valid starting_after UUID", () => {
    const qs = buildCardsQuery(new URLSearchParams("starting_after=7ef7d65c-9023-4da3-b113-3b8583fd7951"));
    expect(qs).toBe("?starting_after=7ef7d65c-9023-4da3-b113-3b8583fd7951");
  });

  it("rejects unknown query param", () => {
    expect(() => buildCardsQuery(new URLSearchParams("page=1"))).toThrow(RequestValidationError);
  });

  it("rejects page_size out of range", () => {
    expect(() => buildCardsQuery(new URLSearchParams("page_size=9999"))).toThrow(RequestValidationError);
  });

  it("rejects invalid starting_after (non-UUID)", () => {
    expect(() => buildCardsQuery(new URLSearchParams("starting_after=bad"))).toThrow(RequestValidationError);
  });

  it("rejects invalid date format for begin", () => {
    expect(() => buildCardsQuery(new URLSearchParams("begin=01/01/2024"))).toThrow(RequestValidationError);
  });
});

describe("buildTransactionsQuery", () => {
  it("returns empty string for no params", () => {
    expect(buildTransactionsQuery(new URLSearchParams())).toBe("");
  });

  it("passes through valid result filter", () => {
    expect(buildTransactionsQuery(new URLSearchParams("result=APPROVED"))).toBe("?result=APPROVED");
  });

  it("rejects invalid result value", () => {
    expect(() => buildTransactionsQuery(new URLSearchParams("result=MAYBE"))).toThrow(RequestValidationError);
  });

  it("rejects unknown query param", () => {
    expect(() => buildTransactionsQuery(new URLSearchParams("page=1"))).toThrow(RequestValidationError);
  });

  it("passes through valid card_token", () => {
    const qs = buildTransactionsQuery(new URLSearchParams("card_token=7ef7d65c-9023-4da3-b113-3b8583fd7951"));
    expect(qs).toBe("?card_token=7ef7d65c-9023-4da3-b113-3b8583fd7951");
  });
});
