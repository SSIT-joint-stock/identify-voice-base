import axiosInstance from "@/api/axios.instance";
import { VOICE_API_ENDPOINTS } from "@/constants";
import type { ApiResponse } from "@/types";
import type {
  IdentifyTwoVoiceRequest,
  IdentifyTwoVoiceResponse,
  IdentifyVoiceRequest,
  IdentifyVoiceResponse,
  UploadVoiceRequest,
  UploadVoiceResponse,
  VoiceIdentifyItem,
  VoiceIdentifyTwoItem,
} from "../types/voice.types";

type IdentifyMode = "SINGLE" | "MULTI";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function normalizeCriminalRecord(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function appendIfPresent(formData: FormData, key: string, value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue) {
    formData.append(key, trimmedValue);
  }
}

function unwrapApiResponse<T>(payload: ApiResponse<T> | T): {
  data: T;
  message: string;
} {
  if (isRecord(payload) && "data" in payload) {
    return {
      data: payload.data as T,
      message: asString(payload.message, ""),
    };
  }

  return {
    data: payload as T,
    message: "",
  };
}

function normalizeSegments(
  value: unknown,
): Array<{ start: number; end: number }> {
  return asArray<unknown>(value).map((segment) => {
    const record = isRecord(segment) ? segment : {};
    return {
      start: asNumber(record.start) ?? 0,
      end: asNumber(record.end) ?? 0,
    };
  });
}

function normalizeIdentifyItem(item: unknown): VoiceIdentifyItem | null {
  if (!isRecord(item)) return null;

  const nested = isRecord(item.match)
    ? item.match
    : isRecord(item.result)
      ? item.result
      : null;

  const data = nested ?? item;

  return {
    message: asString(data.message, asString(item.message, "")),
    matched_voice_id: asString(
      data.matched_voice_id,
      asString(data.voice_id, asString(item.matched_voice_id, "")),
    ),
    voice_id: asString(data.voice_id, asString(item.voice_id, "")),
    score: asNumber(data.score),
    name: asString(data.name, asString(item.name, "")),
    citizen_identification: asString(
      data.citizen_identification,
      asString(item.citizen_identification, ""),
    ),
    phone_number: asString(data.phone_number, asString(item.phone_number, "")),
    hometown: asString(data.hometown, asString(item.hometown, "")),
    job: asString(data.job, asString(item.job, "")),
    passport: asString(data.passport, asString(item.passport, "")),
    criminal_record: normalizeCriminalRecord(
      data.criminal_record ?? item.criminal_record,
    ),
  };
}

function normalizeIdentifyTwoItem(item: unknown): VoiceIdentifyTwoItem | null {
  if (!isRecord(item)) return null;

  const base = normalizeIdentifyItem(item);
  if (!base) return null;

  return {
    ...base,
    audio_path: asString(item.audio_path, ""),
    num_speakers: asNumber(item.num_speakers),
    audio_segment: normalizeSegments(item.audio_segment ?? item.segments),
  };
}

function extractSpeakerItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.speakers)) {
    return payload.speakers;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  return Object.values(payload).filter((value) => isRecord(value));
}

function buildUploadVoiceFormData(payload: UploadVoiceRequest): FormData {
  const formData = new FormData();

  formData.append("audio", payload.file);
  formData.append("name", payload.name.trim());
  appendIfPresent(
    formData,
    "citizen_identification",
    payload.citizen_identification,
  );
  appendIfPresent(formData, "phone_number", payload.phone_number);
  appendIfPresent(formData, "hometown", payload.hometown);
  appendIfPresent(formData, "job", payload.job);
  appendIfPresent(formData, "passport", payload.passport);
  appendIfPresent(formData, "criminal_record", payload.criminal_record);

  return formData;
}

function buildIdentifyFormData(file: File, type: IdentifyMode): FormData {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  return formData;
}

export const voiceApi = {
  async uploadVoice(payload: UploadVoiceRequest): Promise<UploadVoiceResponse> {
    const formData = buildUploadVoiceFormData(payload);

    const response = await axiosInstance.post<
      ApiResponse<Record<string, unknown>>
    >(VOICE_API_ENDPOINTS.ENROLL, formData);

    const { data, message } = unwrapApiResponse(response.data);

    return {
      message: message || "Upload voice thanh cong.",
      voice_id: isRecord(data) ? asString(data.voice_id, "") : "",
      raw: response.data,
    };
  },

  async identifyVoice(
    payload: IdentifyVoiceRequest,
  ): Promise<IdentifyVoiceResponse> {
    const formData = buildIdentifyFormData(payload.file, "SINGLE");
    const response = await axiosInstance.post<ApiResponse<unknown>>(
      VOICE_API_ENDPOINTS.IDENTIFY,
      formData,
    );

    const { data } = unwrapApiResponse(response.data);

    const items = extractSpeakerItems(data)
      .map(normalizeIdentifyItem)
      .filter((item): item is VoiceIdentifyItem => item !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 5);

    return {
      items,
      raw: response.data,
    };
  },

  async identifyTwoVoice(
    payload: IdentifyTwoVoiceRequest,
  ): Promise<IdentifyTwoVoiceResponse> {
    const formData = buildIdentifyFormData(payload.file, "MULTI");
    const response = await axiosInstance.post<ApiResponse<unknown>>(
      VOICE_API_ENDPOINTS.IDENTIFY,
      formData,
    );

    const { data } = unwrapApiResponse(response.data);

    const items = extractSpeakerItems(data)
      .map(normalizeIdentifyTwoItem)
      .filter((item): item is VoiceIdentifyTwoItem => item !== null);

    return {
      items,
      raw: response.data,
    };
  },
};
