import axiosInstance from "@/api/axios.instance";
import type { ApiResponse } from "@/types";
import type {
  DetectLanguageResponse,
  OcrResponse,
  SpeechToTextResponse,
  TranslateResponse,
} from "../types/translate.types";

export interface OcrRequest {
  file: File;
  language?: string;
}

export interface SpeechToTextRequest {
  file: File;
  language?: string;
}

export interface TranslateTextRequest {
  sourceText: string;
  targetLang: string;
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
    formData.append("return_timestamp", "false");
    formData.append("denoise_audio", "false");

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
};
