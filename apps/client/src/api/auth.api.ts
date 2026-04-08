import axiosInstance from "./axios.instance";
import type { ApiResponse } from "@/types";
import type {
  LoginRequest,
  LoginResponseData,
  RefreshResponseData,
  RegisterRequest,
  ResetPasswordRequest,
} from "@/types/auth.types";

const AUTH_ENDPOINTS = {
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  REFRESH: "/auth/refresh",
  LOGOUT: "/auth/logout",
  RESET_PASSWORD: "/auth/reset-password",
} as const;

export async function loginApi(data: LoginRequest) {
  const res = await axiosInstance.post<ApiResponse<LoginResponseData>>(
    AUTH_ENDPOINTS.LOGIN,
    data,
    { withCredentials: true },
  );
  return res.data;
}

export async function registerApi(data: RegisterRequest) {
  const res = await axiosInstance.post<ApiResponse>(
    AUTH_ENDPOINTS.REGISTER,
    data,
  );
  return res.data;
}

export async function refreshTokenApi() {
  const res = await axiosInstance.post<ApiResponse<RefreshResponseData>>(
    AUTH_ENDPOINTS.REFRESH,
    null,
    { withCredentials: true },
  );
  return res.data;
}

export async function logoutApi() {
  const res = await axiosInstance.post<ApiResponse>(AUTH_ENDPOINTS.LOGOUT);
  return res.data;
}

export async function resetPasswordApi(data: ResetPasswordRequest) {
  const res = await axiosInstance.post<ApiResponse>(
    AUTH_ENDPOINTS.RESET_PASSWORD,
    data,
  );
  return res.data;
}
