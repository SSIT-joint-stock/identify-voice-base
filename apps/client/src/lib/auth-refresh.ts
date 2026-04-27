import axios from "axios";
import { env } from "@/configs/env.config";
import { expireClientSession } from "@/lib/auth-session";
import { useAuthStore } from "@/store/auth.store";
import type { ApiResponse } from "@/types";
import { isAccessTokenExpired } from "@/utils/auth-token";

type SessionExpiryReason = "expired" | "unauthorized";

interface RefreshPayload {
  access_token: string;
}

let refreshPromise: Promise<string> | null = null;

function shouldExpireSessionOnRefreshError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  return status === 400 || status === 401 || status === 403 || status === 404;
}

export async function silentlyRefreshAccessToken(
  reason: SessionExpiryReason = "unauthorized",
): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<ApiResponse<RefreshPayload>>(
        `${env.API_BASE_URL}/auth/refresh`,
        null,
        {
          withCredentials: true,
          headers: {
            Accept: "application/json",
          },
        },
      )
      .then((response) => {
        const nextToken = response.data.data.access_token;
        useAuthStore.getState().setAccessToken(nextToken);
        return nextToken;
      })
      .catch((error: unknown) => {
        if (shouldExpireSessionOnRefreshError(error)) {
          expireClientSession(reason);
        }

        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function getValidAccessToken(options?: {
  forceRefresh?: boolean;
  minValidityMs?: number;
  reason?: SessionExpiryReason;
}): Promise<string | null> {
  const {
    forceRefresh = false,
    minValidityMs = 5_000,
    reason = "expired",
  } = options ?? {};
  const { accessToken, user } = useAuthStore.getState();

  if (
    !forceRefresh &&
    accessToken &&
    !isAccessTokenExpired(accessToken, minValidityMs)
  ) {
    return accessToken;
  }

  if (!user && !forceRefresh) {
    return accessToken ?? null;
  }

  try {
    return await silentlyRefreshAccessToken(reason);
  } catch (error) {
    if (!forceRefresh && accessToken && !isAccessTokenExpired(accessToken, 0)) {
      return accessToken;
    }

    throw error;
  }
}
