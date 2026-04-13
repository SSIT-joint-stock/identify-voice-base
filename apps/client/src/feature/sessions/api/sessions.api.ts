import axiosInstance from "@/api/axios.instance";
import { refreshTokenApi } from "@/api/auth.api";
import { env } from "@/configs/env.config";
import { VOICE_API_ENDPOINTS } from "@/constants";
import { expireClientSession } from "@/lib/auth-session";
import { useAuthStore } from "@/store/auth.store";
import type { ApiResponse } from "@/types";

import type { SessionDetail, SessionListResult } from "../types/session.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapApiData<T>(payload: unknown): T {
  if (isRecord(payload) && "data" in payload) {
    return payload.data as T;
  }

  return payload as T;
}

function normalizeSpeakerAudioUrl(audioUrl: string): string {
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

async function fetchSpeakerAudioWithToken(
  audioUrl: string,
  token: string,
): Promise<Response> {
  return fetch(audioUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "audio/mpeg,audio/wav,audio/*,*/*",
    },
  });
}

export interface ListSessionsParams {
  page?: number;
  page_size?: 10 | 25 | 50;
  from_date?: string;
  to_date?: string;
}

export const sessionsApi = {
  async listSessions(params: ListSessionsParams): Promise<SessionListResult> {
    const response = await axiosInstance.get<ApiResponse<SessionListResult>>(
      VOICE_API_ENDPOINTS.SESSIONS,
      { params },
    );

    return unwrapApiData<SessionListResult>(response.data);
  },

  async getSessionDetail(id: string): Promise<SessionDetail> {
    const response = await axiosInstance.get<ApiResponse<SessionDetail>>(
      `${VOICE_API_ENDPOINTS.SESSIONS}/${id}`,
    );

    return unwrapApiData<SessionDetail>(response.data);
  },

  async getSpeakerAudioBlob(audioUrl: string): Promise<Blob> {
    const normalizedUrl = normalizeSpeakerAudioUrl(audioUrl);
    let accessToken = useAuthStore.getState().accessToken;

    if (!accessToken) {
      try {
        const refreshed = await refreshTokenApi();
        accessToken = refreshed.data.access_token;
        useAuthStore.getState().setAccessToken(accessToken);
      } catch {
        expireClientSession("unauthorized");
        throw new Error("Phiên đăng nhập đã hết hạn.");
      }
    }

    let response = await fetchSpeakerAudioWithToken(normalizedUrl, accessToken);

    if (response.status === 401) {
      try {
        const refreshed = await refreshTokenApi();
        const nextToken = refreshed.data.access_token;
        useAuthStore.getState().setAccessToken(nextToken);
        response = await fetchSpeakerAudioWithToken(normalizedUrl, nextToken);
      } catch {
        expireClientSession("unauthorized");
        throw new Error("Không thể làm mới phiên đăng nhập.");
      }
    }

    if (!response.ok) {
      throw new Error(`Không tải được audio speaker (${response.status}).`);
    }

    return response.blob();
  },
};
