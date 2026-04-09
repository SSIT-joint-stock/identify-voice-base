import axios from "axios";
import type {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/configs/env.config";
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

// ─── Request Interceptor ───────────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  },
);

// ─── Response Interceptor ──────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
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

      // Handle global error cases
      if (status === 401) {
        localStorage.removeItem("access_token");
        // Redirect to login if needed
        // window.location.href = '/login'
      }

      return Promise.reject(apiError);
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
