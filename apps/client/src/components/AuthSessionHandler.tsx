import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const accessToken = useAuthStore((state) => state.accessToken);

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
    if (!accessToken) {
      return;
    }

    if (isAccessTokenExpired(accessToken, 0)) {
      expireClientSession("expired");
      return;
    }

    const expiryMs = getAccessTokenExpiryMs(accessToken);
    if (expiryMs === null) {
      expireClientSession("expired");
      return;
    }

    const timeoutId = window.setTimeout(
      () => {
        expireClientSession("expired");
      },
      Math.max(expiryMs - Date.now(), 0),
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [accessToken]);

  return null;
}
