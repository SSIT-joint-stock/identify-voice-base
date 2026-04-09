import { useVoiceStore } from "@/feature/voice/store/voice.store";
import queryClient from "@/libs/query-client";
import { useAuthStore } from "@/store/auth.store";

export const SESSION_EXPIRED_EVENT = "auth:session-expired";

export function clearClientSession() {
  useAuthStore.getState().clearAuth();
  useVoiceStore.getState().resetAllResults();
  queryClient.clear();
}

export function expireClientSession(reason: "expired" | "unauthorized") {
  clearClientSession();

  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SESSION_EXPIRED_EVENT, {
      detail: { reason },
    }),
  );
}
