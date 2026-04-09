import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { ROUTES } from "@/constants";
import { isAccessTokenExpired } from "@/utils/auth-token";

/**
 * Layout for auth pages (Login, Register).
 * No sidebar, no header — clean full-screen layout.
 * Redirects to Home if user is already authenticated.
 */
export function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasValidToken = !isAccessTokenExpired(accessToken, 0);

  if (isAuthenticated && hasValidToken) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <Outlet />;
}
