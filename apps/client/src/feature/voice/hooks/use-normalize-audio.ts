import { refreshTokenApi } from "@/api/auth.api";
import { env } from "@/configs/env.config";
import { expireClientSession } from "@/lib/auth-session";
import { useAuthStore } from "@/store/auth.store";

export function useNormalizeAudio() {
  const WAVEFORM_FALLBACK_MESSAGE =
    "Khong the tai waveform cho file audio nay. Ban van co the phat bang trinh phat mac dinh ben duoi.";

  function normalizeAudioUrl(audioUrl: string): string {
    const trimmed = audioUrl.trim().replace("/api/v1/api/v1/", "/api/v1/");

    try {
      const parsed = new URL(trimmed, env.API_BASE_URL);

      if (parsed.pathname.includes("/sessions/")) {
        const sessionPathIndex = parsed.pathname.indexOf("/sessions/");
        const sessionPath = parsed.pathname.slice(sessionPathIndex);
        return `${env.API_BASE_URL}${sessionPath}`;
      }

      return parsed.toString();
    } catch {
      if (trimmed.startsWith("/sessions/")) {
        return `${env.API_BASE_URL}${trimmed}`;
      }

      return trimmed;
    }
  }

  async function fetchAudioWithToken(audioUrl: string, token?: string | null) {
    return fetch(audioUrl, {
      method: "GET",
      headers: {
        Accept: "audio/mpeg,audio/wav,audio/*,*/*",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }

  async function fetchProtectedAudioBlob(audioUrl: string): Promise<Blob> {
    const normalizedUrl = normalizeAudioUrl(audioUrl);
    let accessToken = useAuthStore.getState().accessToken;

    if (!accessToken) {
      try {
        const refreshed = await refreshTokenApi();
        accessToken = refreshed.data.access_token;
        useAuthStore.getState().setAccessToken(accessToken);
      } catch {
        expireClientSession("unauthorized");
        throw new Error("Phien dang nhap da het han.");
      }
    }

    let response = await fetchAudioWithToken(normalizedUrl, accessToken);

    if (response.status === 401) {
      try {
        const refreshed = await refreshTokenApi();
        const nextToken = refreshed.data.access_token;
        useAuthStore.getState().setAccessToken(nextToken);
        response = await fetchAudioWithToken(normalizedUrl, nextToken);
      } catch {
        expireClientSession("unauthorized");
        throw new Error("Khong the lam moi phien dang nhap.");
      }
    }

    if (!response.ok) {
      throw new Error(`Khong tai duoc audio (${response.status}).`);
    }

    return response.blob();
  }

  return {
    normalizeAudioUrl,
    fetchAudioWithToken,
    fetchProtectedAudioBlob,
    WAVEFORM_FALLBACK_MESSAGE,
  };
}
