import { UpstreamHttpError } from "./errors";

export interface PrivacyClientOptions {
  apiKey: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class PrivacyClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: PrivacyClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
    this.fetchImpl = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async get(pathAndQuery: string): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${pathAndQuery}`, {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `api-key ${this.apiKey}`
        },
        signal: controller.signal
      });

      const contentType = response.headers.get("content-type") ?? "";
      const isJson = contentType.toLowerCase().includes("application/json");
      const body = isJson ? await response.json() : null;

      if (!response.ok) {
        throw new UpstreamHttpError(response.status, body);
      }

      return body;
    } catch (error) {
      if (error instanceof UpstreamHttpError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new UpstreamHttpError(504, null);
      }

      throw new UpstreamHttpError(502, null);
    } finally {
      clearTimeout(timeout);
    }
  }
}
