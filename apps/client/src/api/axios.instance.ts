import axios from "axios";
import type {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/configs/env.config";
import { expireClientSession } from "@/lib/auth-session";
import { useAuthStore } from "@/store/auth.store";
import type { ApiError } from "@/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getApiErrorPayload(data: unknown) {
  if (!isRecord(data)) {
    return {
      message: undefined,
      code: undefined,
      details: undefined,
      errors: undefined,
    };
  }

  const nestedError = isRecord(data.error) ? data.error : undefined;
  const details = isRecord(nestedError?.details)
    ? nestedError.details
    : undefined;

  return {
    message:
      (typeof nestedError?.message === "string"
        ? nestedError.message
        : undefined) ??
      (typeof data.message === "string" ? data.message : undefined),
    code: typeof nestedError?.code === "string" ? nestedError.code : undefined,
    details,
    errors: isRecord(data.errors)
      ? (data.errors as Record<string, string[]>)
      : undefined,
  };
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 30_000,
  headers: {
    Accept: "application/json",
  },
});

const PUBLIC_AUTH_ENDPOINTS = new Set(["/auth/login", "/auth/refresh"]);

function getRequestPath(url: string | undefined): string {
  if (!url) {
    return "";
  }

  try {
    return new URL(url, env.API_BASE_URL).pathname;
  } catch {
    return url;
  }
}

function isPublicAuthRequest(url: string | undefined): boolean {
  return PUBLIC_AUTH_ENDPOINTS.has(getRequestPath(url));
}

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;

    if (token && config.headers && !isPublicAuthRequest(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const payload = getApiErrorPayload(error.response?.data);

      const apiError: ApiError = {
        message:
          payload.message ?? error.message ?? "An unexpected error occurred",
        statusCode: status ?? 500,
        code: payload.code,
        details: payload.details,
        errors: payload.errors,
      };

      if (status === 401 && !isPublicAuthRequest(error.config?.url)) {
        expireClientSession("unauthorized");
      }

      return Promise.reject(apiError);
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
