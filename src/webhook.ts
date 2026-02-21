import { timingSafeEqual } from "./auth";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => {
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  });

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
}

export async function computePrivacyWebhookHmac(secret: string, payload: unknown): Promise<string> {
  const message = stableStringify(payload);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bytesToBase64(new Uint8Array(signature));
}

export async function verifyPrivacyWebhookHmac(
  secret: string,
  payload: unknown,
  requestHmac: string | null
): Promise<boolean> {
  if (!requestHmac || requestHmac.trim().length === 0) {
    return false;
  }

  const expected = await computePrivacyWebhookHmac(secret, payload);
  return timingSafeEqual(requestHmac.trim(), expected);
}
