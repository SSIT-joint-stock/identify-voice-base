import axiosInstance from "@/api/axios.instance";
import type { ApiResponse } from "@/types";
import type {
  DetectLanguageResponse,
  OcrResponse,
  SpeechToTextResponse,
  TranslateJobCreateResponse,
  TranslateJobResponse,
  TranslateResponse,
} from "../types/translate.types";

export interface OcrRequest {
  file: File;
  language?: string;
}

export interface SpeechToTextRequest {
  file: File;
  language?: string;
  returnTimestamp?: boolean;
  denoiseAudio?: boolean;
}

export interface TranslateTextRequest {
  sourceText: string;
  targetLang: string;
}

export type TranslateExportFormat = "docx" | "pdf";

export interface TranslateExportRequest {
  text: string;
  format: TranslateExportFormat;
  filename?: string;
  title?: string;
}

export interface DetectLanguageRequest {
  text: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapApiResponse<T>(payload: ApiResponse<T> | T): T {
  if (isRecord(payload) && "data" in payload) {
    return payload.data as T;
  }

  return payload as T;
}

export const translateApi = {
  async ocr(payload: OcrRequest): Promise<OcrResponse> {
    const formData = new FormData();
    formData.append("file", payload.file);
    if (payload.language) {
      formData.append("language", payload.language);
    }
    formData.append("format", "true");

    const response = await axiosInstance.post<ApiResponse<OcrResponse>>(
      "/ai-core/ocr",
      formData,
    );

    return unwrapApiResponse(response.data);
  },

  async speechToText(
    payload: SpeechToTextRequest,
  ): Promise<SpeechToTextResponse> {
    const formData = new FormData();
    formData.append("file", payload.file);
    if (payload.language) {
      formData.append("language", payload.language);
    }
    formData.append(
      "return_timestamp",
      String(payload.returnTimestamp ?? false),
    );
    formData.append("denoise_audio", String(payload.denoiseAudio ?? false));

    const response = await axiosInstance.post<
      ApiResponse<SpeechToTextResponse>
    >("/ai-core/speech-to-text", formData);

    return unwrapApiResponse(response.data);
  },

  async detectLanguage(
    payload: DetectLanguageRequest,
  ): Promise<DetectLanguageResponse> {
    const response = await axiosInstance.post<
      ApiResponse<DetectLanguageResponse>
    >("/ai-core/detect-language", {
      text: payload.text,
    });

    return unwrapApiResponse(response.data);
  },

  async translate(payload: TranslateTextRequest): Promise<TranslateResponse> {
    const response = await axiosInstance.post<ApiResponse<TranslateResponse>>(
      "/ai-core/translate",
      {
        source_text: payload.sourceText,
        target_lang: payload.targetLang,
      },
    );

    return unwrapApiResponse(response.data);
  },

  async createTranslateJob(
    payload: TranslateTextRequest,
  ): Promise<TranslateJobCreateResponse> {
    const response = await axiosInstance.post<
      ApiResponse<TranslateJobCreateResponse>
    >("/ai-core/translate/jobs", {
      source_text: payload.sourceText,
      target_lang: payload.targetLang,
    });

    return unwrapApiResponse(response.data);
  },

  async getTranslateJob(jobId: string): Promise<TranslateJobResponse> {
    const response = await axiosInstance.get<ApiResponse<TranslateJobResponse>>(
      `/ai-core/translate/jobs/${jobId}`,
    );

    return unwrapApiResponse(response.data);
  },

  async exportTranslation(payload: TranslateExportRequest): Promise<Blob> {
    const response = await axiosInstance.post<Blob>(
      "/ai-core/translate/export",
      payload,
      {
        responseType: "blob",
      },
    );

    return response.data;
  },

  async translateSummarize(
    payload: TranslateTextRequest,
  ): Promise<TranslateResponse> {
    const response = await axiosInstance.post<ApiResponse<TranslateResponse>>(
      "/ai-core/translate-summarize",
      {
        source_text: payload.sourceText,
        target_lang: payload.targetLang,
      },
    );

    return unwrapApiResponse(response.data);
  },

  async createTranslateSummarizeJob(
    payload: TranslateTextRequest,
  ): Promise<TranslateJobCreateResponse> {
    const response = await axiosInstance.post<
      ApiResponse<TranslateJobCreateResponse>
    >("/ai-core/translate-summarize/jobs", {
      source_text: payload.sourceText,
      target_lang: payload.targetLang,
    });

    return unwrapApiResponse(response.data);
  },
};
