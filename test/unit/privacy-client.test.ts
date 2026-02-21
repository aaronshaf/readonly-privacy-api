import { describe, expect, it, vi } from "vitest";
import { PrivacyClient } from "../../src/privacy-client";
import { UpstreamHttpError } from "../../src/errors";

const BASE_URL = "https://sandbox.privacy.com/v1";

function makeClient(fetchImpl: typeof fetch, timeoutMs?: number): PrivacyClient {
  const opts = timeoutMs !== undefined
    ? { apiKey: "test-key", baseUrl: BASE_URL, fetchImpl, timeoutMs }
    : { apiKey: "test-key", baseUrl: BASE_URL, fetchImpl };
  return new PrivacyClient(opts);
}

describe("PrivacyClient", () => {
  it("sends correct Authorization header", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    const client = makeClient(fetchMock as unknown as typeof fetch);
    await client.get("/cards");

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    if (!call) throw new Error("fetch was not called");
    const [, options] = call;
    expect((options.headers as Record<string, string>)["authorization"]).toBe("api-key test-key");
  });

  it("returns parsed JSON body on success", async () => {
    const body = { data: [], has_more: false };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" }
    }));

    const client = makeClient(fetchMock as unknown as typeof fetch);
    const result = await client.get("/cards");
    expect(result).toEqual(body);
  });

  it("throws UpstreamHttpError on 4xx", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ message: "not found" }), {
      status: 404,
      headers: { "content-type": "application/json" }
    }));

    const client = makeClient(fetchMock as unknown as typeof fetch);
    await expect(client.get("/cards/bad-token")).rejects.toThrow(UpstreamHttpError);
  });

  it("throws UpstreamHttpError with status 504 on timeout", async () => {
    const fetchMock = vi.fn((_url: string, options: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    const client = makeClient(fetchMock as unknown as typeof fetch, 10);
    const error = await client.get("/cards").catch((e) => e);
    expect(error).toBeInstanceOf(UpstreamHttpError);
    expect((error as UpstreamHttpError).status).toBe(504);
  });

  it("throws UpstreamHttpError with status 502 on network error", async () => {
    const fetchMock = vi.fn(async () => { throw new Error("network failure"); });
    const client = makeClient(fetchMock as unknown as typeof fetch);
    const error = await client.get("/cards").catch((e) => e);
    expect(error).toBeInstanceOf(UpstreamHttpError);
    expect((error as UpstreamHttpError).status).toBe(502);
  });

  it("returns null body for non-JSON response", async () => {
    const fetchMock = vi.fn(async () => new Response("OK", {
      status: 200,
      headers: { "content-type": "text/plain" }
    }));

    const client = makeClient(fetchMock as unknown as typeof fetch);
    const result = await client.get("/healthz");
    expect(result).toBeNull();
  });
});
