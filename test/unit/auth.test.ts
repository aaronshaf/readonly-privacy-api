import { describe, expect, it } from "vitest";
import { isAuthorizedRequest, timingSafeEqual } from "../../src/auth";

describe("timingSafeEqual", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
  });

  it("returns false for different strings", () => {
    expect(timingSafeEqual("abc", "abd")).toBe(false);
  });
});

describe("isAuthorizedRequest", () => {
  it("accepts valid bearer token", () => {
    const request = new Request("https://example.com/cards", {
      headers: {
        Authorization: "Bearer test-token"
      }
    });

    expect(isAuthorizedRequest(request, "test-token")).toBe(true);
  });

  it("rejects missing token", () => {
    const request = new Request("https://example.com/cards");
    expect(isAuthorizedRequest(request, "test-token")).toBe(false);
  });

  it("rejects wrong scheme", () => {
    const request = new Request("https://example.com/cards", {
      headers: {
        Authorization: "api-key test-token"
      }
    });

    expect(isAuthorizedRequest(request, "test-token")).toBe(false);
  });
});
