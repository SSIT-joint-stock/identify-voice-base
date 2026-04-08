import axios from "axios";
import type {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/configs/env.config";
import type { ApiError } from "@/types";

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

      const apiError: ApiError = {
        message:
          (error.response?.data as { message?: string })?.message ??
          error.message ??
          "An unexpected error occurred",
        statusCode: status ?? 500,
        errors: (error.response?.data as { errors?: Record<string, string[]> })
          ?.errors,
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
