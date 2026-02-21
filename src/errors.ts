export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
  };
}

export class RequestValidationError extends Error {
  readonly status = 400;
  readonly code = "bad_request";

  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}

export class UpstreamHttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`Upstream request failed with status ${status}`);
    this.name = "UpstreamHttpError";
    this.status = status;
    this.body = body;
  }
}

export function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(headers ?? {})
    }
  });
}

export function errorResponse(status: number, code: string, message: string): Response {
  const payload: ErrorEnvelope = {
    error: {
      code,
      message
    }
  };
  return jsonResponse(payload, status);
}

const DEFAULT_ERROR_MESSAGE: Record<number, string> = {
  400: "Invalid request to upstream provider.",
  401: "Authentication failed with upstream provider.",
  403: "Upstream provider rejected this request.",
  404: "Requested resource was not found.",
  422: "Upstream provider could not process this request.",
  429: "Upstream rate limit reached.",
  500: "Upstream provider encountered an internal error.",
  502: "Received an invalid response from upstream provider.",
  503: "Upstream provider is unavailable.",
  504: "Upstream provider timed out."
};

export function sanitizeUpstreamError(status: number): Response {
  const fallbackStatus = Number.isInteger(status) && status >= 100 && status <= 599 ? status : 502;
  const message = DEFAULT_ERROR_MESSAGE[fallbackStatus] ?? "Upstream request failed.";

  return errorResponse(fallbackStatus, "upstream_error", message);
}
