import axiosInstance from "@/api/axios.instance";
import { VOICE_API_ENDPOINTS } from "@/constants";
import { normalizeVoiceAudioUrl } from "@/feature/voice/utils/audio-url";
import { getValidAccessToken } from "@/lib/auth-refresh";
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
    const normalizedUrl = normalizeVoiceAudioUrl(audioUrl);
    const accessToken = await getValidAccessToken({
      reason: "unauthorized",
    });

    if (!accessToken) {
      throw new Error("Phiên đăng nhập đã hết hạn.");
    }

    let response = await fetchSpeakerAudioWithToken(normalizedUrl, accessToken);

    if (response.status === 401) {
      const nextToken = await getValidAccessToken({
        forceRefresh: true,
        reason: "unauthorized",
      });

      if (!nextToken) {
        throw new Error("Không thể làm mới phiên đăng nhập.");
      }

      response = await fetchSpeakerAudioWithToken(normalizedUrl, nextToken);
    }

    if (!response.ok) {
      throw new Error(`Không tải được audio speaker (${response.status}).`);
    }

    return response.blob();
  },
};
