import { Schema } from "effect";
import { RequestValidationError } from "./errors";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const UuidV4Schema = Schema.String.pipe(Schema.pattern(UUID_V4_REGEX));
const DateSchema = Schema.String.pipe(Schema.pattern(DATE_REGEX));
const PageSizeSchema = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.lessThanOrEqualTo(1000)
);
const TransactionResultSchema = Schema.Literal("APPROVED", "DECLINED");

const CardsQuerySchema = Schema.Struct({
  account_token: Schema.optional(UuidV4Schema),
  begin: Schema.optional(DateSchema),
  end: Schema.optional(DateSchema),
  page_size: Schema.optional(PageSizeSchema),
  starting_after: Schema.optional(UuidV4Schema)
});

const TransactionsQuerySchema = Schema.Struct({
  account_token: Schema.optional(UuidV4Schema),
  card_token: Schema.optional(UuidV4Schema),
  result: Schema.optional(TransactionResultSchema),
  begin: Schema.optional(DateSchema),
  end: Schema.optional(DateSchema),
  page_size: Schema.optional(PageSizeSchema),
  starting_after: Schema.optional(UuidV4Schema)
});

function assertAllowedQueryParams(params: URLSearchParams, allowed: Set<string>): void {
  params.forEach((_value, key) => {
    if (!allowed.has(key)) {
      throw new RequestValidationError(`${key} is not a valid parameter.`);
    }
  });
}

function paramsToRecord(params: URLSearchParams): Record<string, string> {
  const record: Record<string, string> = {};
  params.forEach((value, key) => {
    if (!(key in record)) {
      record[key] = value;
    }
  });
  return record;
}

export function validateTokenPathParam(value: string, fieldName: string): void {
  const decoded = Schema.decodeUnknownEither(UuidV4Schema)(value);
  if (decoded._tag === "Left") {
    throw new RequestValidationError(`${fieldName} must be a valid UUID v4.`);
  }
}

function decodeOrThrow<A, I>(
  schema: Schema.Schema<A, I, never>,
  raw: I,
  errorMessage: string
): A {
  const decoded = Schema.decodeUnknownEither(schema)(raw);
  if (decoded._tag === "Left") {
    throw new RequestValidationError(errorMessage);
  }
  return decoded.right;
}

export function buildCardsQuery(params: URLSearchParams): string {
  const allowed = new Set(["account_token", "begin", "end", "page_size", "starting_after"]);
  assertAllowedQueryParams(params, allowed);

  const decoded = decodeOrThrow(CardsQuerySchema, paramsToRecord(params), "Invalid cards query parameters.");

  const sanitized = new URLSearchParams();
  if (decoded.account_token) {
    sanitized.set("account_token", decoded.account_token);
  }
  if (decoded.begin) {
    sanitized.set("begin", decoded.begin);
  }
  if (decoded.end) {
    sanitized.set("end", decoded.end);
  }
  if (typeof decoded.page_size === "number") {
    sanitized.set("page_size", String(decoded.page_size));
  }
  if (decoded.starting_after) {
    sanitized.set("starting_after", decoded.starting_after);
  }

  const query = sanitized.toString();
  return query.length > 0 ? `?${query}` : "";
}

export function buildTransactionsQuery(params: URLSearchParams): string {
  const allowed = new Set([
    "account_token",
    "card_token",
    "result",
    "begin",
    "end",
    "page_size",
    "starting_after"
  ]);
  assertAllowedQueryParams(params, allowed);

  const decoded = decodeOrThrow(
    TransactionsQuerySchema,
    paramsToRecord(params),
    "Invalid transactions query parameters."
  );

  const sanitized = new URLSearchParams();
  if (decoded.account_token) {
    sanitized.set("account_token", decoded.account_token);
  }
  if (decoded.card_token) {
    sanitized.set("card_token", decoded.card_token);
  }
  if (decoded.begin) {
    sanitized.set("begin", decoded.begin);
  }
  if (decoded.end) {
    sanitized.set("end", decoded.end);
  }
  if (typeof decoded.page_size === "number") {
    sanitized.set("page_size", String(decoded.page_size));
  }
  if (decoded.starting_after) {
    sanitized.set("starting_after", decoded.starting_after);
  }
  if (decoded.result) {
    sanitized.set("result", decoded.result);
  }

  const query = sanitized.toString();
  return query.length > 0 ? `?${query}` : "";
}
