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
  VoiceGender,
  VoiceIdentifyItem,
  VoiceIdentifyTwoItem,
  VoiceSpeakerTranscript,
  VoiceTranscriptSegment,
  VoiceTruthSource,
} from "../types/voice.types";

type IdentifyMode = "SINGLE" | "MULTI";

interface SpeechToTextSpeakerResponse {
  transcript: string | VoiceTranscriptSegment[];
  language?: string;
}

interface SpeechToTextJobCreateResponse {
  job_id: string;
}

interface SpeechToTextJobResponse {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  mode: "speech-to-text";
  result?: SpeechToTextSpeakerResponse;
  error?: string;
}

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

function asAgeNumber(value: unknown): number | undefined {
  const age = asNumber(value);
  return typeof age === "number" && age > 0 ? age : undefined;
}

function asTruthSource(value: unknown): VoiceTruthSource | undefined {
  if (value === "BUSINESS" || value === "AI" || value === "NONE") {
    return value;
  }

  return undefined;
}

function asVoiceGender(value: unknown): VoiceGender | undefined {
  if (value === "MALE" || value === "FEMALE") {
    return value;
  }

  return undefined;
}

function normalizeCriminalRecord(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function extractAudioUrl(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;

  const value = asString(payload.audio_url, "");
  return value || undefined;
}

function extractIdentifyMetadata(payload: unknown): {
  session_id?: string;
  identified_at?: string;
  type?: IdentifyMode;
} {
  if (!isRecord(payload)) {
    return {};
  }

  const sessionId = asString(payload.session_id, "");
  const identifiedAt = asString(payload.identified_at, "");
  const type =
    payload.type === "SINGLE" || payload.type === "MULTI"
      ? payload.type
      : undefined;

  return {
    session_id: sessionId || undefined,
    identified_at: identifiedAt || undefined,
    type,
  };
}

function extractTranscriptAndLanguage(payload: unknown): {
  transcript?: string | null;
  detected_language?: string | null;
  speaker_transcripts?: VoiceSpeakerTranscript[];
} {
  if (!isRecord(payload)) return {};
  return {
    transcript:
      typeof payload.transcript === "string" ? payload.transcript : null,
    detected_language:
      typeof payload.detected_language === "string"
        ? payload.detected_language
        : null,
    speaker_transcripts: normalizeSpeakerTranscripts(
      payload.speaker_transcripts,
    ),
  };
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

function normalizeTranscriptSegments(value: unknown): VoiceTranscriptSegment[] {
  return asArray<unknown>(value)
    .map((segment) => {
      const record = isRecord(segment) ? segment : {};
      const text = asString(record.text, "").trim();
      return {
        start: asNumber(record.start) ?? 0,
        end: asNumber(record.end) ?? 0,
        text,
      };
    })
    .filter((segment) => segment.text.length > 0);
}

function normalizeSpeakerTranscripts(
  value: unknown,
): VoiceSpeakerTranscript[] | undefined {
  const transcripts = asArray<unknown>(value)
    .map((item, index): VoiceSpeakerTranscript | null => {
      if (!isRecord(item)) return null;

      const segments = normalizeTranscriptSegments(item.segments);
      const text = asString(item.text, "").trim();
      const title = asString(item.title, "").trim();
      const speakerLabel = asString(item.speaker_label, "").trim();

      if (!text && segments.length === 0 && !title && !speakerLabel) {
        return null;
      }

      return {
        speaker_label: speakerLabel || undefined,
        title: title || `Người nói ${index + 1}`,
        text: text || segments.map((segment) => segment.text).join(" "),
        segments,
      };
    })
    .filter((item): item is VoiceSpeakerTranscript => item !== null);

  return transcripts.length > 0 ? transcripts : undefined;
}

function getTranscriptText(transcript: unknown): string {
  if (typeof transcript === "string") return transcript.trim();

  return normalizeTranscriptSegments(transcript)
    .map((segment) => segment.text)
    .join(" ")
    .trim();
}

async function transcribeAudioFile(
  file: File,
): Promise<{ transcript: string | null; detected_language: string | null }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("return_timestamp", "false");
  formData.append("denoise_audio", "false");

  const response = await axiosInstance.post<
    ApiResponse<SpeechToTextSpeakerResponse>
  >("/ai-core/speech-to-text", formData);
  const data = unwrapApiResponse(response.data).data;
  const transcript = getTranscriptText(data?.transcript);

  return {
    transcript: transcript || null,
    detected_language:
      typeof data?.language === "string" ? data.language : null,
  };
}

function resolveTruthSource(params: {
  matchedVoiceId?: string;
  enrollAudioUrl?: string;
  truthSource?: VoiceTruthSource;
}): VoiceTruthSource | undefined {
  if (params.truthSource) {
    return params.truthSource;
  }

  if (params.matchedVoiceId && params.enrollAudioUrl) {
    return "BUSINESS";
  }

  if (params.matchedVoiceId) {
    return "AI";
  }

  return "NONE";
}

function normalizeIdentifyItem(item: unknown): VoiceIdentifyItem | null {
  if (!isRecord(item)) return null;

  const nested = isRecord(item.match)
    ? item.match
    : isRecord(item.result)
      ? item.result
      : null;

  const data = nested ?? item;
  const matchedVoiceId = asString(
    data.matched_voice_id,
    asString(data.voice_id, asString(item.matched_voice_id, "")),
  );
  const voiceId = asString(data.voice_id, asString(item.voice_id, ""));
  const speakerLabel = asString(
    data.speaker_label,
    asString(
      item.speaker_label,
      asString(data.label, asString(item.label, "")),
    ),
  );
  const audioUrl = asString(data.audio_url, asString(item.audio_url, ""));
  const enrollAudioUrl = asString(
    data.enroll_audio_url,
    asString(item.enroll_audio_url, ""),
  );
  const truthSource = resolveTruthSource({
    matchedVoiceId: matchedVoiceId || undefined,
    enrollAudioUrl: enrollAudioUrl || undefined,
    truthSource: asTruthSource(
      data.truth_source ?? item.truth_source ?? data.source ?? item.source,
    ),
  });

  return {
    user_id: asString(data.user_id, asString(item.user_id, "")) || undefined,
    speaker_label: speakerLabel || undefined,
    message: asString(data.message, asString(item.message, "")),
    matched_voice_id: matchedVoiceId || undefined,
    voice_id: voiceId || undefined,
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
    age: asAgeNumber(data.age ?? item.age),
    gender: asVoiceGender(data.gender ?? item.gender),
    criminal_record: normalizeCriminalRecord(
      data.criminal_record ?? item.criminal_record,
    ),
    audio_url: audioUrl || undefined,
    enroll_audio_url: enrollAudioUrl || undefined,
    truth_source: truthSource,
  };
}

function normalizeIdentifyTwoItem(item: unknown): VoiceIdentifyTwoItem | null {
  if (!isRecord(item)) return null;

  const base = normalizeIdentifyItem(item);
  if (!base) return null;

  return {
    ...base,
    audio_path: asString(item.audio_path, base.audio_url ?? "") || undefined,
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
  appendIfPresent(formData, "age", payload.age);
  appendIfPresent(formData, "gender", payload.gender);
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
  async normalizeAudio(file: File): Promise<File> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post<Blob>(
      "/ai-core/audio/normalize",
      formData,
      {
        responseType: "blob",
      },
    );

    const sourceName = file.name.replace(/\.[^.]+$/, "").trim() || "audio";

    return new File([response.data], `${sourceName}-normalized.wav`, {
      type: "audio/wav",
      lastModified: Date.now(),
    });
  },

  async filterNoise(file: File, signal?: AbortSignal): Promise<File> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post<Blob>(
      "/ai-core/filter-noise",
      formData,
      {
        responseType: "blob",
        signal,
      },
    );

    const sourceName = file.name.replace(/\.[^.]+$/, "").trim() || "audio";

    return new File([response.data], `${sourceName}-filtered.wav`, {
      type: "audio/wav",
      lastModified: Date.now(),
    });
  },

  async uploadVoice(payload: UploadVoiceRequest): Promise<UploadVoiceResponse> {
    const formData = buildUploadVoiceFormData(payload);

    const response = await axiosInstance.post<
      ApiResponse<Record<string, unknown>>
    >(VOICE_API_ENDPOINTS.ENROLL, formData);

    const { data, message } = unwrapApiResponse(response.data);

    return {
      message: message || "Tải lên giọng nói thành công!",
      voice_id: isRecord(data) ? asString(data.voice_id, "") : "",
      user_id: isRecord(data)
        ? asString(data.user_id, "") || undefined
        : undefined,
      audio_url: isRecord(data)
        ? asString(data.audio_url, "") || undefined
        : undefined,
      age: isRecord(data) ? asAgeNumber(data.age) : undefined,
      gender: isRecord(data) ? asVoiceGender(data.gender) : undefined,
      enrolled_at: isRecord(data)
        ? asString(data.enrolled_at, "") || undefined
        : undefined,
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
    const audioUrl = extractAudioUrl(data);
    const metadata = extractIdentifyMetadata(data);

    const items = extractSpeakerItems(data)
      .map(normalizeIdentifyItem)
      .filter((item): item is VoiceIdentifyItem => item !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 5);

    return {
      items,
      session_id: metadata.session_id,
      audio_url: audioUrl,
      identified_at: metadata.identified_at,
      type: metadata.type,
      ...extractTranscriptAndLanguage(data),
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
    const audioUrl = extractAudioUrl(data);
    const metadata = extractIdentifyMetadata(data);

    const items = extractSpeakerItems(data)
      .map(normalizeIdentifyTwoItem)
      .filter((item): item is VoiceIdentifyTwoItem => item !== null);

    return {
      items,
      session_id: metadata.session_id,
      audio_url: audioUrl,
      identified_at: metadata.identified_at,
      type: metadata.type,
      ...extractTranscriptAndLanguage(data),
      raw: response.data,
    };
  },

  async transcribeSpeakerAudioUrl(
    audioUrl: string,
    fileName = "speaker.wav",
  ): Promise<{ transcript: string | null; detected_language: string | null }> {
    return transcribeAudioFile(
      await this.getAudioFileFromUrl(audioUrl, fileName),
    );
  },

  async getAudioFileFromUrl(audioUrl: string, fileName = "speaker.wav") {
    const audioResponse = await axiosInstance.get<Blob>(audioUrl, {
      responseType: "blob",
    });
    return new File([audioResponse.data], fileName, {
      type: audioResponse.data.type || "audio/wav",
      lastModified: Date.now(),
    });
  },

  async transcribeAudioFile(
    file: File,
  ): Promise<{ transcript: string | null; detected_language: string | null }> {
    return transcribeAudioFile(file);
  },

  async createSpeechToTextJob(
    file: File,
  ): Promise<SpeechToTextJobCreateResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("return_timestamp", "false");
    formData.append("denoise_audio", "false");

    const response = await axiosInstance.post<
      ApiResponse<SpeechToTextJobCreateResponse>
    >("/ai-core/speech-to-text/jobs", formData);

    return unwrapApiResponse(response.data).data;
  },

  async getSpeechToTextJob(jobId: string): Promise<SpeechToTextJobResponse> {
    const response = await axiosInstance.get<
      ApiResponse<SpeechToTextJobResponse>
    >(`/ai-core/speech-to-text/jobs/${jobId}`);

    return unwrapApiResponse(response.data).data;
  },

  normalizeSpeechToTextResult(payload?: SpeechToTextSpeakerResponse | null): {
    transcript: string | null;
    detected_language: string | null;
  } {
    const transcript = getTranscriptText(payload?.transcript);

    return {
      transcript: transcript || null,
      detected_language:
        typeof payload?.language === "string" ? payload.language : null,
    };
  },
};
