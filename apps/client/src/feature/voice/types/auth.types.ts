// ─── Auth API Types ────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

// ─── Request Types ─────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  role?: string;
}

export interface ResetPasswordRequest {
  old_password: string;
  new_password: string;
  confirm_new_password: string;
}

// ─── Response Types ────────────────────────────────────────────────────────

export interface LoginResponseData {
  access_token: string;
  user: AuthUser;
}

export interface RefreshResponseData {
  access_token: string;
  expires_in: number;
}
