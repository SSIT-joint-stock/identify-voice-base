import { create } from "zustand";
import type { AuthUser } from "@/types/auth.types";
import { isAccessTokenExpired } from "@/utils/auth-token";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}

/**
 * Auth state store.
 * Hydrates from localStorage on creation so sessions survive page refreshes.
 */
export const useAuthStore = create<AuthState>((set, get) => {
  // Hydrate from localStorage
  let storedToken = localStorage.getItem("access_token");
  const storedUser = localStorage.getItem("auth_user");

  let user: AuthUser | null = null;
  try {
    user = storedUser ? (JSON.parse(storedUser) as AuthUser) : null;
  } catch {
    user = null;
  }

  if (!storedToken || !user || isAccessTokenExpired(storedToken, 0)) {
    storedToken = null;
    user = null;
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_user");
  }

  return {
    user,
    accessToken: storedToken,
    isAuthenticated: !!storedToken && !!user,

    setAuth: (user, token) => {
      localStorage.setItem("access_token", token);
      localStorage.setItem("auth_user", JSON.stringify(user));
      set({ user, accessToken: token, isAuthenticated: true });
    },

    setAccessToken: (token) => {
      if (isAccessTokenExpired(token, 0)) {
        get().clearAuth();
        return;
      }

      localStorage.setItem("access_token", token);
      set({
        accessToken: token,
        isAuthenticated: !!token && !!get().user,
      });
    },

    clearAuth: () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth_user");
      set({ user: null, accessToken: null, isAuthenticated: false });
    },
  };
});
