import { APP_PERMISSIONS, USER_ROLES, USER_STATUSES } from "@/types/auth.types";
import type { AppPermission, AuthUser } from "@/types/auth.types";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getTokenAccountPayload(
  token: string | null | undefined,
): Record<string, unknown> | null {
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  if (isRecord(payload.payload)) {
    return payload.payload;
  }

  return payload;
}

export function getAuthUserFromAccessToken(
  token: string | null | undefined,
): AuthUser | null {
  const payload = getTokenAccountPayload(token);
  if (!payload) {
    return null;
  }

  const id = typeof payload.id === "string" ? payload.id : null;
  const email = typeof payload.email === "string" ? payload.email : null;
  const username = typeof payload.username === "string" ? payload.username : "";
  const role = USER_ROLES.includes(payload.role as AuthUser["role"])
    ? (payload.role as AuthUser["role"])
    : null;
  const status = USER_STATUSES.includes(payload.status as AuthUser["status"])
    ? (payload.status as AuthUser["status"])
    : null;
  const permissions = Array.isArray(payload.permissions)
    ? payload.permissions.filter(
        (permission): permission is AppPermission =>
          typeof permission === "string" &&
          APP_PERMISSIONS.includes(permission as AppPermission),
      )
    : [];

  if (!id || !email || !role || !status) {
    return null;
  }

  return {
    id,
    email,
    username,
    role,
    status,
    permissions,
  };
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
