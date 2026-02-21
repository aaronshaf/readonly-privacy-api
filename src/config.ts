import { ParseResult, Schema } from "effect";

export interface Env {
  PRIVACY_API_KEY?: string;
  WORKER_API_TOKEN?: string;
  ENABLE_TRANSACTION_TOKEN_ROUTE?: string;
}

export interface RuntimeConfig {
  privacyApiKey: string;
  workerApiToken: string;
  privacyBaseUrl: string;
  enableTransactionTokenRoute: boolean;
}

const PRIVACY_BASE_URL = "https://api.privacy.com/v1";

const EnvSchema = Schema.Struct({
  PRIVACY_API_KEY: Schema.NonEmptyString,
  WORKER_API_TOKEN: Schema.NonEmptyString,
  ENABLE_TRANSACTION_TOKEN_ROUTE: Schema.optional(Schema.String)
});

function parseBooleanFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return value.toLowerCase() === "true";
}

export function loadRuntimeConfig(env: Env): RuntimeConfig {
  const decoded = Schema.decodeUnknownEither(EnvSchema)(env);
  if (decoded._tag === "Left") {
    const details = ParseResult.TreeFormatter.formatErrorSync(decoded.left);
    throw new Error(`Invalid worker environment configuration: ${details}`);
  }

  return {
    privacyApiKey: decoded.right.PRIVACY_API_KEY,
    workerApiToken: decoded.right.WORKER_API_TOKEN,
    privacyBaseUrl: PRIVACY_BASE_URL,
    enableTransactionTokenRoute: parseBooleanFlag(decoded.right.ENABLE_TRANSACTION_TOKEN_ROUTE)
  };
}
