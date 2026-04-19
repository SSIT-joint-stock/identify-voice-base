import { Navigate, Outlet } from "react-router-dom";

import { ROUTES } from "@/constants";
import { isAdminUser } from "@/lib/auth";
import { useAuthStore } from "@/store/auth.store";

export function AdminOnlyRoute() {
  const user = useAuthStore((state) => state.user);

  if (!isAdminUser(user)) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <Outlet />;
}
