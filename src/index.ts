import { isAuthorizedRequest } from "./auth";
import { loadRuntimeConfig, type Env } from "./config";
import { SKILL_MD } from "./skill";
import {
  errorResponse,
  jsonResponse,
  RequestValidationError,
  sanitizeUpstreamError,
  UpstreamHttpError
} from "./errors";
import { sanitizeCardsPayload } from "./filters/cards";
import { sanitizeTransactionsPayload } from "./filters/transactions";
import { PrivacyClient } from "./privacy-client";
import { buildCardsQuery, buildTransactionsQuery, validateTokenPathParam } from "./query";
interface Logger {
  info: (message: string) => void;
  error: (message: string) => void;
}

interface WorkerDependencies {
  fetchImpl?: typeof fetch;
  logger?: Logger;
}

function decodePathToken(encoded: string, field: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    throw new RequestValidationError(`${field} has invalid URL encoding.`);
  }
}

function methodNotAllowed(allowed: string[]): Response {
  return errorResponse(405, "method_not_allowed", `Use one of: ${allowed.join(", ")}.`);
}

function makePrivacyClient(config: ReturnType<typeof loadRuntimeConfig>, fetchImpl?: typeof fetch): PrivacyClient {
  const options: ConstructorParameters<typeof PrivacyClient>[0] = {
    apiKey: config.privacyApiKey,
    baseUrl: config.privacyBaseUrl
  };
  if (fetchImpl) {
    options.fetchImpl = fetchImpl;
  }
  return new PrivacyClient(options);
}

async function handleCardsList(
  requestUrl: URL,
  config: ReturnType<typeof loadRuntimeConfig>,
  fetchImpl?: typeof fetch
): Promise<Response> {
  const query = buildCardsQuery(requestUrl.searchParams);
  const client = makePrivacyClient(config, fetchImpl);
  const upstreamPayload = await client.get(`/cards${query}`);
  return jsonResponse(sanitizeCardsPayload(upstreamPayload));
}

async function handleCardByToken(
  token: string,
  config: ReturnType<typeof loadRuntimeConfig>,
  fetchImpl?: typeof fetch
): Promise<Response> {
  validateTokenPathParam(token, "card_token");
  const client = makePrivacyClient(config, fetchImpl);
  const upstreamPayload = await client.get(`/cards/${token}`);
  return jsonResponse(sanitizeCardsPayload(upstreamPayload));
}

async function handleTransactionsList(
  requestUrl: URL,
  config: ReturnType<typeof loadRuntimeConfig>,
  fetchImpl?: typeof fetch
): Promise<Response> {
  const query = buildTransactionsQuery(requestUrl.searchParams);
  const client = makePrivacyClient(config, fetchImpl);
  const upstreamPayload = await client.get(`/transactions${query}`);
  return jsonResponse(sanitizeTransactionsPayload(upstreamPayload));
}

async function handleTransactionByToken(
  token: string,
  config: ReturnType<typeof loadRuntimeConfig>,
  fetchImpl?: typeof fetch
): Promise<Response> {
  validateTokenPathParam(token, "transaction_token");

  if (!config.enableTransactionTokenRoute) {
    return errorResponse(
      501,
      "not_implemented",
      "GET /transactions/:token is disabled by default in v1 proxy settings."
    );
  }

  const client = makePrivacyClient(config, fetchImpl);
  const upstreamPayload = await client.get(`/transactions/${token}`);
  return jsonResponse(sanitizeTransactionsPayload(upstreamPayload));
}

export function createWorker(dependencies: WorkerDependencies = {}): ExportedHandler<Env> {
  const logger: Logger = dependencies.logger ?? {
    info: (message) => console.log(message),
    error: (message) => console.error(message)
  };

  return {
    async fetch(request, env): Promise<Response> {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/healthz") {
        return jsonResponse({ status: "ok", service: "readonly-privacy-api" });
      }

      if (request.method === "GET" && url.pathname === "/SKILL.md") {
        return new Response(SKILL_MD, {
          headers: { "content-type": "text/markdown; charset=utf-8" }
        });
      }

      let config: ReturnType<typeof loadRuntimeConfig>;
      try {
        config = loadRuntimeConfig(env);
      } catch (error) {
        logger.error(JSON.stringify({ event: "missing_secrets", message: String(error) }));
        return errorResponse(500, "misconfigured_worker", "Worker is missing required secrets.");
      }

      try {
        if (!isAuthorizedRequest(request, config.workerApiToken)) {
          return errorResponse(401, "unauthorized", "Missing or invalid bearer token.");
        }

        if (request.method !== "GET") {
          return methodNotAllowed(["GET"]);
        }

        if (url.pathname === "/cards") {
          return await handleCardsList(url, config, dependencies.fetchImpl);
        }

        if (url.pathname === "/transactions") {
          return await handleTransactionsList(url, config, dependencies.fetchImpl);
        }

        const cardTokenMatch = /^\/cards\/([^/]+)$/.exec(url.pathname);
        if (cardTokenMatch) {
          const tokenMatch = cardTokenMatch[1];
          if (!tokenMatch) {
            return errorResponse(400, "bad_request", "card_token is required.");
          }
          const token = decodePathToken(tokenMatch, "card_token");
          return await handleCardByToken(token, config, dependencies.fetchImpl);
        }

        const transactionTokenMatch = /^\/transactions\/([^/]+)$/.exec(url.pathname);
        if (transactionTokenMatch) {
          const tokenMatch = transactionTokenMatch[1];
          if (!tokenMatch) {
            return errorResponse(400, "bad_request", "transaction_token is required.");
          }
          const token = decodePathToken(tokenMatch, "transaction_token");
          return await handleTransactionByToken(token, config, dependencies.fetchImpl);
        }

        return errorResponse(404, "not_found", "Route not found.");
      } catch (error) {
        if (error instanceof RequestValidationError) {
          return errorResponse(error.status, error.code, error.message);
        }

        if (error instanceof UpstreamHttpError) {
          return sanitizeUpstreamError(error.status);
        }

        logger.error(JSON.stringify({ event: "unhandled_error", message: String(error) }));
        return errorResponse(500, "internal_error", "Unexpected server error.");
      }
    }
  };
}

export default createWorker();
