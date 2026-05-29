import { env } from "@/configs/env.config";
import { getValidAccessToken } from "@/lib/auth-refresh";
import { useCallback } from "react";

export function useNormalizeAudio() {
  const WAVEFORM_FALLBACK_MESSAGE =
    "Không thể tải waveform cho file audio này. Bạn vẫn có thể phát bằng trình phát mặc định bên dưới.";

  const normalizeAudioUrl = useCallback((audioUrl: string): string => {
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
  }, []);

  const fetchAudioWithToken = useCallback(
    async (audioUrl: string, token?: string | null) => {
      return fetch(audioUrl, {
        method: "GET",
        headers: {
          Accept: "audio/mpeg,audio/wav,audio/*,*/*",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    },
    [],
  );

  const fetchProtectedAudioBlob = useCallback(
    async (audioUrl: string): Promise<Blob> => {
      const normalizedUrl = normalizeAudioUrl(audioUrl);
      const accessToken = await getValidAccessToken({
        reason: "unauthorized",
      });

      if (!accessToken) {
        throw new Error("Phien dang nhap da het han.");
      }

      let response = await fetchAudioWithToken(normalizedUrl, accessToken);

      if (response.status === 401) {
        const nextToken = await getValidAccessToken({
          forceRefresh: true,
          reason: "unauthorized",
        });

        if (!nextToken) {
          throw new Error("Không thể làm mới phiên đăng nhập.");
        }

        response = await fetchAudioWithToken(normalizedUrl, nextToken);
      }

      if (!response.ok) {
        throw new Error(`Không tải được audio (${response.status}).`);
      }

      return response.blob();
    },
    [fetchAudioWithToken, normalizeAudioUrl],
  );

  return {
    normalizeAudioUrl,
    fetchAudioWithToken,
    fetchProtectedAudioBlob,
    WAVEFORM_FALLBACK_MESSAGE,
  };
}
