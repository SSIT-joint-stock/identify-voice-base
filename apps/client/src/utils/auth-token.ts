function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const paddingLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + "=".repeat(paddingLength);
    return window.atob(padded);
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  const decodedPayload = decodeBase64Url(parts[1]);
  if (!decodedPayload) {
    return null;
  }

  try {
    const payload = JSON.parse(decodedPayload) as unknown;
    if (
      typeof payload !== "object" ||
      payload === null ||
      Array.isArray(payload)
    ) {
      return null;
    }

    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getAccessTokenExpiryMs(
  token: string | null | undefined,
): number | null {
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;

  if (typeof exp !== "number" || !Number.isFinite(exp)) {
    return null;
  }

  return exp * 1000;
}

export function isAccessTokenExpired(
  token: string | null | undefined,
  clockSkewMs = 5_000,
): boolean {
  const expiryMs = getAccessTokenExpiryMs(token);
  if (expiryMs === null) {
    return true;
  }

  return expiryMs <= Date.now() + clockSkewMs;
}
