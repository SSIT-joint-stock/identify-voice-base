import { create } from "zustand";
import { APP_PERMISSIONS, USER_ROLES, USER_STATUSES } from "@/types/auth.types";
import type { AuthUser } from "@/types/auth.types";
import { getAuthUserFromAccessToken } from "@/utils/auth-token";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}

function readStoredUser(): AuthUser | null {
  const storedUser = localStorage.getItem("auth_user");

  try {
    const parsed = storedUser ? (JSON.parse(storedUser) as unknown) : null;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const account = parsed as Record<string, unknown>;

    if (
      typeof account.id !== "string" ||
      typeof account.email !== "string" ||
      typeof account.username !== "string" ||
      !USER_ROLES.includes(account.role as AuthUser["role"]) ||
      !USER_STATUSES.includes(account.status as AuthUser["status"]) ||
      !Array.isArray(account.permissions) ||
      !account.permissions.every(
        (permission) =>
          typeof permission === "string" &&
          APP_PERMISSIONS.includes(
            permission as AuthUser["permissions"][number],
          ),
      )
    ) {
      return null;
    }

    return {
      id: account.id,
      email: account.email,
      username: account.username,
      role: account.role,
      status: account.status,
      permissions: account.permissions,
    } as AuthUser;
  } catch {
    return null;
  }
}

function clearPersistedAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("auth_user");
}

export const useAuthStore = create<AuthState>((set, get) => {
  let storedToken = localStorage.getItem("access_token");
  const storedUser = readStoredUser();
  const tokenUser = getAuthUserFromAccessToken(storedToken);
  const user = tokenUser ?? storedUser;

  if (!user) {
    storedToken = null;
    clearPersistedAuth();
  } else {
    localStorage.setItem("auth_user", JSON.stringify(user));
  }

  return {
    user,
    accessToken: storedToken,
    isAuthenticated: !!user,

    setAuth: (user, token) => {
      const nextUser = getAuthUserFromAccessToken(token) ?? user;
      localStorage.setItem("access_token", token);
      localStorage.setItem("auth_user", JSON.stringify(nextUser));
      set({ user: nextUser, accessToken: token, isAuthenticated: true });
    },

    setAccessToken: (token) => {
      const nextUser = getAuthUserFromAccessToken(token) ?? get().user;
      localStorage.setItem("access_token", token);

      if (nextUser) {
        localStorage.setItem("auth_user", JSON.stringify(nextUser));
      } else {
        localStorage.removeItem("auth_user");
      }

      set({
        user: nextUser,
        accessToken: token,
        isAuthenticated: !!nextUser,
      });
    },

    clearAuth: () => {
      clearPersistedAuth();
      set({ user: null, accessToken: null, isAuthenticated: false });
    },
  };
});
