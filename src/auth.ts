function normalizeAuthorizationHeader(value: string | null): string {
  return value?.trim() ?? "";
}

function extractBearerToken(value: string): string | null {
  const [scheme, token, ...rest] = value.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer") {
    return null;
  }
  if (!token || rest.length > 0) {
    return null;
  }
  return token;
}

export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);

  const maxLength = Math.max(aBytes.length, bBytes.length);
  let mismatch = aBytes.length === bBytes.length ? 0 : 1;

  for (let i = 0; i < maxLength; i += 1) {
    const aByte = aBytes[i] ?? 0;
    const bByte = bBytes[i] ?? 0;
    mismatch |= aByte ^ bByte;
  }

  return mismatch === 0;
}

export function isAuthorizedRequest(request: Request, expectedToken: string): boolean {
  const header = normalizeAuthorizationHeader(request.headers.get("authorization"));
  const providedToken = extractBearerToken(header) ?? new URL(request.url).searchParams.get("token");

  if (!providedToken) {
    return false;
  }

  return timingSafeEqual(providedToken, expectedToken);
}
