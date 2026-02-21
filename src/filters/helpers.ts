export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
}

export function pickString(record: UnknownRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

export function pickNumber(record: UnknownRecord, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function pickStringArray(record: UnknownRecord, key: string): string[] | undefined {
  const value = record[key];
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter((entry): entry is string => typeof entry === "string");
  return strings;
}

export function withDefinedValues(record: UnknownRecord): UnknownRecord {
  const compact: UnknownRecord = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) {
      compact[key] = value;
    }
  }
  return compact;
}
