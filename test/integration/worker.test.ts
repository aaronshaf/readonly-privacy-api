import { describe, expect, it, vi } from "vitest";
import { createWorker } from "../../src/index";
import { computePrivacyWebhookHmac } from "../../src/webhook";
import type { Env } from "../../src/config";

const env: Env = {
  PRIVACY_API_KEY: "privacy-test-key",
  WORKER_API_TOKEN: "worker-test-token"
};
const envWithoutSecrets: Env = {};

const noopExecutionContext = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined
} as unknown as ExecutionContext;

async function invoke(worker: ExportedHandler<Env>, request: Request): Promise<Response> {
  if (!worker.fetch) {
    throw new Error("fetch handler is not defined");
  }
  return worker.fetch(
    request as unknown as Request<unknown, IncomingRequestCfProperties<unknown>>,
    env,
    noopExecutionContext
  );
}

describe("worker routes", () => {
  it("serves health without auth", async () => {
    const worker = createWorker();
    const response = await invoke(worker, new Request("https://worker.example/healthz"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "readonly-privacy-api"
    });
  });

  it("serves health even when secrets are missing", async () => {
    const worker = createWorker();
    if (!worker.fetch) {
      throw new Error("fetch handler is not defined");
    }

    const response = await worker.fetch(
      new Request("https://worker.example/healthz") as unknown as Request<
        unknown,
        IncomingRequestCfProperties<unknown>
      >,
      envWithoutSecrets,
      noopExecutionContext
    );

    expect(response.status).toBe(200);
  });

  it("rejects protected route without bearer token", async () => {
    const worker = createWorker();
    const response = await invoke(worker, new Request("https://worker.example/cards"));

    expect(response.status).toBe(401);
  });

  it("filters card sensitive fields on list route", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: [
            {
              token: "7ef7d65c-9023-4da3-b113-3b8583fd7951",
              last_four: "4142",
              pan: "4111111111111111",
              cvv: "123",
              exp_month: "06",
              exp_year: "2027",
              state: "OPEN"
            }
          ],
          page: 1,
          total_entries: 1,
          total_pages: 1
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      );
    });

    const worker = createWorker({ fetchImpl: fetchMock as unknown as typeof fetch });
    const request = new Request("https://worker.example/cards?page=1", {
      headers: {
        Authorization: "Bearer worker-test-token"
      }
    });

    const response = await invoke(worker, request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      data: [
        {
          token: "7ef7d65c-9023-4da3-b113-3b8583fd7951",
          last_four: "4142",
          state: "OPEN"
        }
      ],
      page: 1,
      total_entries: 1,
      total_pages: 1
    });
  });

  it("returns 501 for transaction-by-token by default", async () => {
    const worker = createWorker();
    const request = new Request(
      "https://worker.example/transactions/764fa5a3-2371-40f0-8cbb-9a2e1230d955",
      {
        headers: {
          Authorization: "Bearer worker-test-token"
        }
      }
    );

    const response = await invoke(worker, request);
    expect(response.status).toBe(501);
  });

  it("verifies webhook HMAC", async () => {
    const worker = createWorker();
    const payload = {
      token: "764fa5a3-2371-40f0-8cbb-9a2e1230d955",
      status: "SETTLED"
    };
    const hmac = await computePrivacyWebhookHmac(env.PRIVACY_API_KEY!, payload);

    const response = await invoke(
      worker,
      new Request("https://worker.example/webhooks/privacy", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-privacy-hmac": hmac
        },
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(200);
  });

  it("rejects webhook with bad HMAC", async () => {
    const worker = createWorker();

    const response = await invoke(
      worker,
      new Request("https://worker.example/webhooks/privacy", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-privacy-hmac": "invalid"
        },
        body: JSON.stringify({ token: "abc" })
      })
    );

    expect(response.status).toBe(401);
  });

  it("rejects unknown query parameters", async () => {
    const worker = createWorker();
    const response = await invoke(
      worker,
      new Request("https://worker.example/cards?bad=true", {
        headers: {
          Authorization: "Bearer worker-test-token"
        }
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed URL-encoded card token", async () => {
    const worker = createWorker();
    const response = await invoke(
      worker,
      new Request("https://worker.example/cards/%E0%A4%A", {
        headers: {
          Authorization: "Bearer worker-test-token"
        }
      })
    );

    expect(response.status).toBe(400);
  });
});
