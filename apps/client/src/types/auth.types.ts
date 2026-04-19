export const USER_ROLES = ["ADMIN", "OPERATOR"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const APP_PERMISSIONS = [
  "accounts.manage",
  "profile.read",
  "profile.update",
  "profile.delete",
  "voices.read",
  "voices.enroll",
  "voices.update",
  "voices.delete",
  "identify.run",
  "sessions.read",
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  permissions: AppPermission[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  role?: UserRole;
}

export interface ResetPasswordRequest {
  old_password: string;
  new_password: string;
  confirm_new_password: string;
}

export interface LoginResponseData {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  account: Pick<AuthUser, "id" | "email" | "role" | "permissions"> &
    Partial<Pick<AuthUser, "username" | "status">>;
}

export interface RefreshResponseData {
  access_token: string;
  expires_in?: number;
}
