import { asRecord, pickBoolean, pickNumber, pickString, pickStringArray, type UnknownRecord, withDefinedValues } from "./helpers";

function sanitizeFunding(funding: unknown): UnknownRecord | undefined {
  const record = asRecord(funding);
  if (!record) {
    return undefined;
  }

  return withDefinedValues({
    created: pickString(record, "created"),
    token: pickString(record, "token"),
    type: pickString(record, "type"),
    state: pickString(record, "state"),
    nickname: pickString(record, "nickname"),
    account_name: pickString(record, "account_name"),
    last_four: pickString(record, "last_four")
  });
}

export function sanitizeCard(card: unknown): UnknownRecord {
  const record = asRecord(card);
  if (!record) {
    return {};
  }

  return withDefinedValues({
    created: pickString(record, "created"),
    token: pickString(record, "token"),
    last_four: pickString(record, "last_four"),
    hostname: pickString(record, "hostname"),
    memo: pickString(record, "memo"),
    type: pickString(record, "type"),
    spend_limit: pickNumber(record, "spend_limit"),
    spend_limit_duration: pickString(record, "spend_limit_duration"),
    state: pickString(record, "state"),
    funding: sanitizeFunding(record.funding),
    auth_rule_tokens: pickStringArray(record, "auth_rule_tokens")
  });
}

function sanitizeCardsList(cards: unknown): UnknownRecord[] {
  if (!Array.isArray(cards)) {
    return [];
  }

  return cards.map((card) => sanitizeCard(card));
}

export function sanitizeCardsPayload(payload: unknown): UnknownRecord {
  const record = asRecord(payload);
  if (!record) {
    return {};
  }

  if (Array.isArray(record.data)) {
    return withDefinedValues({
      data: sanitizeCardsList(record.data),
      has_more: pickBoolean(record, "has_more")
    });
  }

  return sanitizeCard(payload);
}
