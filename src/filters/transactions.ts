import { asRecord, pickBoolean, pickNumber, pickString, type UnknownRecord, withDefinedValues } from "./helpers";

function sanitizeEvent(event: unknown): UnknownRecord {
  const record = asRecord(event);
  if (!record) {
    return {};
  }

  return withDefinedValues({
    amount: pickNumber(record, "amount"),
    created: pickString(record, "created"),
    result: pickString(record, "result"),
    type: pickString(record, "type"),
    token: pickString(record, "token")
  });
}

function sanitizeFundingEntry(entry: unknown): UnknownRecord {
  const record = asRecord(entry);
  if (!record) {
    return {};
  }

  return withDefinedValues({
    amount: pickNumber(record, "amount"),
    token: pickString(record, "token"),
    type: pickString(record, "type")
  });
}

function sanitizeMerchant(merchant: unknown): UnknownRecord | undefined {
  const record = asRecord(merchant);
  if (!record) {
    return undefined;
  }

  return withDefinedValues({
    acceptor_id: pickString(record, "acceptor_id"),
    city: pickString(record, "city"),
    country: pickString(record, "country"),
    descriptor: pickString(record, "descriptor"),
    mcc: pickString(record, "mcc"),
    state: pickString(record, "state")
  });
}

export function sanitizeTransaction(transaction: unknown): UnknownRecord {
  const record = asRecord(transaction);
  if (!record) {
    return {};
  }

  return withDefinedValues({
    amount: pickNumber(record, "amount"),
    authorization_amount: pickNumber(record, "authorization_amount"),
    card_token: pickString(record, "card_token"),
    merchant_amount: pickNumber(record, "merchant_amount"),
    merchant_authorization_amount: pickNumber(record, "merchant_authorization_amount"),
    merchant_currency: pickString(record, "merchant_currency"),
    acquirer_fee: pickNumber(record, "acquirer_fee"),
    created: pickString(record, "created"),
    events: Array.isArray(record.events) ? record.events.map((entry) => sanitizeEvent(entry)) : undefined,
    funding: Array.isArray(record.funding)
      ? record.funding.map((entry) => sanitizeFundingEntry(entry))
      : undefined,
    merchant: sanitizeMerchant(record.merchant),
    result: pickString(record, "result"),
    settled_amount: pickNumber(record, "settled_amount"),
    status: pickString(record, "status"),
    token: pickString(record, "token"),
    authorization_code: pickString(record, "authorization_code")
  });
}

function sanitizeTransactionList(entries: unknown): UnknownRecord[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries.map((entry) => sanitizeTransaction(entry));
}

export function sanitizeTransactionsPayload(payload: unknown): UnknownRecord {
  const record = asRecord(payload);
  if (!record) {
    return {};
  }

  if (Array.isArray(record.data)) {
    return withDefinedValues({
      data: sanitizeTransactionList(record.data),
      has_more: pickBoolean(record, "has_more")
    });
  }

  return sanitizeTransaction(payload);
}
