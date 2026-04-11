import axiosInstance from "@/api/axios.instance";
import { VOICE_API_ENDPOINTS } from "@/constants";
import type { ApiResponse } from "@/types";
import type {
  SessionDetailForAudio,
  UpdateEmbeddingJobResponse,
  UpdateVoiceInfoPayload,
  UpdateVoiceInfoResponse,
  VoiceDirectoryDetail,
  VoiceDirectoryListResult,
} from "../types/voice-directory.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapApiData<T>(payload: unknown): T {
  if (isRecord(payload) && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
}

export interface ListVoicesParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export const voiceDirectoryApi = {
  async listVoices(
    params: ListVoicesParams,
  ): Promise<VoiceDirectoryListResult> {
    const response = await axiosInstance.get<
      ApiResponse<VoiceDirectoryListResult>
    >(VOICE_API_ENDPOINTS.VOICES, { params });
    return unwrapApiData<VoiceDirectoryListResult>(response.data);
  },

  async getVoiceDetail(id: string): Promise<VoiceDirectoryDetail> {
    const response = await axiosInstance.get<ApiResponse<VoiceDirectoryDetail>>(
      `${VOICE_API_ENDPOINTS.VOICES}/${id}`,
    );
    return unwrapApiData<VoiceDirectoryDetail>(response.data);
  },

  async updateVoiceInfo(
    id: string,
    body: UpdateVoiceInfoPayload,
  ): Promise<UpdateVoiceInfoResponse> {
    const response = await axiosInstance.patch<
      ApiResponse<UpdateVoiceInfoResponse>
    >(`${VOICE_API_ENDPOINTS.VOICES}/${id}`, body);
    return unwrapApiData<UpdateVoiceInfoResponse>(response.data);
  },

  async deactivateVoice(id: string): Promise<void> {
    await axiosInstance.patch(`${VOICE_API_ENDPOINTS.VOICES}/${id}/deactivate`);
  },

  async updateVoiceFromAudios(
    voiceId: string,
    audioIds: string[],
  ): Promise<UpdateEmbeddingJobResponse> {
    const response = await axiosInstance.post<
      ApiResponse<UpdateEmbeddingJobResponse>
    >(`${VOICE_API_ENDPOINTS.VOICES}/${voiceId}/update-from-audios`, {
      audioIds,
    });
    return unwrapApiData<UpdateEmbeddingJobResponse>(response.data);
  },

  async getSessionDetail(sessionId: string): Promise<SessionDetailForAudio> {
    const response = await axiosInstance.get<
      ApiResponse<SessionDetailForAudio>
    >(`${VOICE_API_ENDPOINTS.SESSIONS}/${sessionId}`);
    return unwrapApiData<SessionDetailForAudio>(response.data);
  },
};
