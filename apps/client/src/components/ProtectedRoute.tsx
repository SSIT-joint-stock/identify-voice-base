import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { ROUTES } from "@/constants";
import { getValidAccessToken } from "@/lib/auth-refresh";

export const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();
  const [sessionCheckFinished, setSessionCheckFinished] = useState(false);

  useEffect(() => {
    if (isAuthenticated || sessionCheckFinished) {
      return;
    }

    let cancelled = false;

    void getValidAccessToken({
      forceRefresh: true,
      reason: "expired",
    })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) {
          setSessionCheckFinished(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, sessionCheckFinished]);

  if (!isAuthenticated && !sessionCheckFinished) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <Outlet />;
};
