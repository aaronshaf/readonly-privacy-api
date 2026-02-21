import { describe, expect, it } from "vitest";
import { loadRuntimeConfig } from "../../src/config";

describe("loadRuntimeConfig", () => {
  it("loads valid config", () => {
    const config = loadRuntimeConfig({
      PRIVACY_API_KEY: "test-key",
      READONLY_PRIVACY_BEARER_TOKEN: "test-token"
    });

    expect(config.privacyApiKey).toBe("test-key");
    expect(config.workerApiToken).toBe("test-token");
    expect(config.enableTransactionTokenRoute).toBe(false);
  });

  it("throws when PRIVACY_API_KEY is missing", () => {
    expect(() => loadRuntimeConfig({ READONLY_PRIVACY_BEARER_TOKEN: "test-token" })).toThrow(
      "Invalid worker environment configuration"
    );
  });

  it("throws when READONLY_PRIVACY_BEARER_TOKEN is missing", () => {
    expect(() => loadRuntimeConfig({ PRIVACY_API_KEY: "test-key" })).toThrow(
      "Invalid worker environment configuration"
    );
  });

  it("throws when PRIVACY_API_KEY is empty string", () => {
    expect(() => loadRuntimeConfig({ PRIVACY_API_KEY: "", READONLY_PRIVACY_BEARER_TOKEN: "test-token" })).toThrow(
      "Invalid worker environment configuration"
    );
  });

  it("enables transaction token route when set to 'true'", () => {
    const config = loadRuntimeConfig({
      PRIVACY_API_KEY: "test-key",
      READONLY_PRIVACY_BEARER_TOKEN: "test-token",
      ENABLE_TRANSACTION_TOKEN_ROUTE: "true"
    });
    expect(config.enableTransactionTokenRoute).toBe(true);
  });

  it("enables transaction token route for uppercase 'TRUE' (case-insensitive)", () => {
    const config = loadRuntimeConfig({
      PRIVACY_API_KEY: "test-key",
      READONLY_PRIVACY_BEARER_TOKEN: "test-token",
      ENABLE_TRANSACTION_TOKEN_ROUTE: "TRUE"
    });
    expect(config.enableTransactionTokenRoute).toBe(true);
  });

  it("does not enable transaction token route for '1'", () => {
    const config = loadRuntimeConfig({
      PRIVACY_API_KEY: "test-key",
      READONLY_PRIVACY_BEARER_TOKEN: "test-token",
      ENABLE_TRANSACTION_TOKEN_ROUTE: "1"
    });
    expect(config.enableTransactionTokenRoute).toBe(false);
  });
});
