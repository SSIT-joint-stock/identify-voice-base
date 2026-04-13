import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { refreshTokenApi } from "@/api/auth.api";
import { ROUTES } from "@/constants";
import { expireClientSession, SESSION_EXPIRED_EVENT } from "@/lib/auth-session";
import { useAuthStore } from "@/store/auth.store";
import {
  getAccessTokenExpiryMs,
  isAccessTokenExpired,
} from "@/utils/auth-token";

function buildLocationState(location: ReturnType<typeof useLocation>) {
  return {
    from: {
      pathname: `${location.pathname}${location.search}${location.hash}`,
    },
  };
}

export function AuthSessionHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);

  useEffect(() => {
    const handleSessionExpired = () => {
      if (location.pathname === ROUTES.LOGIN) {
        return;
      }

      navigate(ROUTES.LOGIN, {
        replace: true,
        state: buildLocationState(location),
      });
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [location, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    const refreshAccessToken = async () => {
      try {
        const response = await refreshTokenApi();
        if (!cancelled) {
          setAccessToken(response.data.access_token);
        }
      } catch {
        if (!cancelled) {
          expireClientSession("expired");
        }
      }
    };

    if (!accessToken || isAccessTokenExpired(accessToken, 0)) {
      void refreshAccessToken();
      return () => {
        cancelled = true;
      };
    }

    const expiryMs = getAccessTokenExpiryMs(accessToken);
    if (expiryMs === null) {
      void refreshAccessToken();
      return () => {
        cancelled = true;
      };
    }

    timeoutId = window.setTimeout(
      () => {
        void refreshAccessToken();
      },
      Math.max(expiryMs - Date.now() - 5_000, 0),
    );

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [accessToken, isAuthenticated, setAccessToken]);

  return null;
}
