import axiosInstance from '@/api/axios.instance';
import { VOICE_API_ENDPOINTS } from '@/constants';
import type {
  IdentifyTwoVoiceRequest,
  IdentifyTwoVoiceResponse,
  IdentifyVoiceRequest,
  IdentifyVoiceResponse,
  UploadVoiceRequest,
  UploadVoiceResponse,
  VoiceIdentifyItem,
  VoiceIdentifyTwoItem,
} from '../types/voice.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeCriminalRecord(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeIdentifyItem(item: unknown): VoiceIdentifyItem | null {
  if (!isRecord(item)) return null;

  // Support nested match results if backend returns them grouped
  const nested = isRecord(item.match) ? item.match : isRecord(item.result) ? item.result : null;

  const data = nested || item;

  return {
    message: asString(data.message, asString(item.message, '')),
    matched_voice_id: asString(data.matched_voice_id, asString(data.voice_id, '')),
    voice_id: asString(data.voice_id, ''),
    score: asNumber(data.score),
    name: asString(data.name, ''),
    citizen_identification: asString(data.citizen_identification, ''),
    phone_number: asString(data.phone_number, ''),
    hometown: asString(data.hometown, ''),
    job: asString(data.job, ''),
    passport: asString(data.passport, ''),
    criminal_record: normalizeCriminalRecord(data.criminal_record),
  };
}

function normalizeIdentifyTwoItem(item: unknown): VoiceIdentifyTwoItem | null {
  if (!isRecord(item)) return null;

  const base = normalizeIdentifyItem(item);
  if (!base) return null;

  return {
    ...base,
    audio_path: asString(item.audio_path, ''),
    num_speakers: asNumber(item.num_speakers),
    audio_segment: asArray<{ start: number; end: number }>(item.audio_segment).map((segment) => ({
      start: asNumber((segment as Record<string, unknown>).start) ?? 0,
      end: asNumber((segment as Record<string, unknown>).end) ?? 0,
    })),
  };
}

function buildUploadVoiceFormData(payload: UploadVoiceRequest): FormData {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('criminal_record', payload.criminal_record);
  return formData;
}

function buildSingleAudioFormData(file: File): FormData {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
}

export const voiceApi = {
  async uploadVoice(payload: UploadVoiceRequest): Promise<UploadVoiceResponse> {
    const formData = buildUploadVoiceFormData(payload);

    const response = await axiosInstance.post(VOICE_API_ENDPOINTS.UPLOAD, formData, {
      params: {
        name: payload.name,
        citizen_identification: payload.citizen_identification,
        phone_number: payload.phone_number,
        hometown: payload.hometown,
        job: payload.job,
        passport: payload.passport,
      },
    });

    const data = response.data as Record<string, unknown>;

    return {
      message: asString(data?.message, 'Upload voice thành công.'),
      voice_id: asString(data?.voice_id, ''),
      raw: response.data,
    };
  },

  async identifyVoice(payload: IdentifyVoiceRequest): Promise<IdentifyVoiceResponse> {
    const formData = buildSingleAudioFormData(payload.file);
    const response = await axiosInstance.post(VOICE_API_ENDPOINTS.IDENTIFY, formData);

    const items = asArray<unknown>(response.data)
      .map(normalizeIdentifyItem)
      .filter((item): item is VoiceIdentifyItem => item !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 5);

    return {
      items,
      raw: response.data,
    };
  },

  async identifyTwoVoice(payload: IdentifyTwoVoiceRequest): Promise<IdentifyTwoVoiceResponse> {
    const formData = buildSingleAudioFormData(payload.file);
    const response = await axiosInstance.post(VOICE_API_ENDPOINTS.IDENTIFY_TWO, formData);

    const data = response.data;
    // Handle both array and object responses (e.g. { "0": {...}, "1": {...} })
    const rawItems = Array.isArray(data) ? data : isRecord(data) ? Object.values(data) : [];

    const items = rawItems
      .map(normalizeIdentifyTwoItem)
      .filter((item): item is VoiceIdentifyTwoItem => item !== null);

    return {
      items,
      raw: data,
    };
  },
};
