import axiosInstance from "@/api/axios.instance";
import type { ApiResponse } from "@/types";
import type {
  AudioTranslateBatchCreateResponse,
  AudioTranslateBatchResponse,
  DetectLanguageResponse,
  ExtractionJobCreateResponse,
  ExtractionJobResponse,
  OcrResponse,
  SpeechToTextResponse,
  TranslateJobCreateResponse,
  TranslateJobResponse,
  TranslateResponse,
  TranslationHistoryFilter,
  TranslationHistoryRecord,
  TranslationHistoryResponse,
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

export interface AudioTranslateBatchRequest {
  files: File[];
  targetLang?: string;
  fileOptions?: Array<{
    sourceLang?: string;
    targetLang?: string;
    returnTimestamp?: boolean;
    denoiseAudio?: boolean;
  }>;
}

export interface AudioTranslateBatchRetryItemRequest {
  sourceLang?: string;
  targetLang?: string;
  returnTimestamp?: boolean;
  denoiseAudio?: boolean;
}

export interface TranslateTextRequest {
  sourceText: string;
  targetLang: string;
  sourceLang?: string;
  sourceFileType?: string;
}

export type TranslateExportFormat = "docx" | "pdf";

export interface TranslateExportRequest {
  text: string;
  format: TranslateExportFormat;
  filename?: string;
  title?: string;
}

export interface UpdateTranslationHistoryRequest {
  translatedText: string;
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

function logSpeechToTextFormData(
  action: "speechToText" | "createSpeechToTextJob",
  formData: FormData,
) {
  const file = formData.get("file");
  const language = formData.get("language");

  console.log(`[S2T API][${action}] request payload`, {
    hasLanguage: language !== null,
    language,
    returnTimestamp: formData.get("return_timestamp"),
    denoiseAudio: formData.get("denoise_audio"),
    file:
      file instanceof File
        ? {
            name: file.name,
            type: file.type,
            size: file.size,
          }
        : file,
  });
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

  async createOcrJob(
    payload: OcrRequest,
  ): Promise<ExtractionJobCreateResponse> {
    const formData = new FormData();
    formData.append("file", payload.file);
    if (payload.language) {
      formData.append("language", payload.language);
    }
    formData.append("format", "true");

    const response = await axiosInstance.post<
      ApiResponse<ExtractionJobCreateResponse>
    >("/ai-core/ocr/jobs", formData);

    return unwrapApiResponse(response.data);
  },

  async getOcrJob(jobId: string): Promise<ExtractionJobResponse<OcrResponse>> {
    const response = await axiosInstance.get<
      ApiResponse<ExtractionJobResponse<OcrResponse>>
    >(`/ai-core/ocr/jobs/${jobId}`);

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

    logSpeechToTextFormData("speechToText", formData);

    const response = await axiosInstance.post<
      ApiResponse<SpeechToTextResponse>
    >("/ai-core/speech-to-text", formData);

    return unwrapApiResponse(response.data);
  },

  async createSpeechToTextJob(
    payload: SpeechToTextRequest,
  ): Promise<ExtractionJobCreateResponse> {
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

    logSpeechToTextFormData("createSpeechToTextJob", formData);

    const response = await axiosInstance.post<
      ApiResponse<ExtractionJobCreateResponse>
    >("/ai-core/speech-to-text/jobs", formData);

    return unwrapApiResponse(response.data);
  },

  async getSpeechToTextJob(
    jobId: string,
  ): Promise<ExtractionJobResponse<SpeechToTextResponse>> {
    const response = await axiosInstance.get<
      ApiResponse<ExtractionJobResponse<SpeechToTextResponse>>
    >(`/ai-core/speech-to-text/jobs/${jobId}`);

    return unwrapApiResponse(response.data);
  },

  async createAudioTranslateBatch(
    payload: AudioTranslateBatchRequest,
  ): Promise<AudioTranslateBatchCreateResponse> {
    const formData = new FormData();
    payload.files.forEach((file) => formData.append("files", file));
    if (payload.targetLang) {
      formData.append("target_lang", payload.targetLang);
    }
    if (payload.fileOptions?.length) {
      formData.append(
        "file_options",
        JSON.stringify(
          payload.fileOptions.map((option) => ({
            source_lang: option.sourceLang,
            target_lang: option.targetLang,
            return_timestamp: option.returnTimestamp ?? false,
            denoise_audio: option.denoiseAudio ?? false,
          })),
        ),
      );
    }

    const response = await axiosInstance.post<
      ApiResponse<AudioTranslateBatchCreateResponse>
    >("/ai-core/audio-translate-batches", formData);

    return unwrapApiResponse(response.data);
  },

  async getAudioTranslateBatch(
    batchId: string,
  ): Promise<AudioTranslateBatchResponse> {
    const response = await axiosInstance.get<
      ApiResponse<AudioTranslateBatchResponse>
    >(`/ai-core/audio-translate-batches/${batchId}`);

    return unwrapApiResponse(response.data);
  },

  async retryAudioTranslateBatchItem(
    batchId: string,
    itemId: string,
    payload?: AudioTranslateBatchRetryItemRequest,
  ): Promise<void> {
    await axiosInstance.post(
      `/ai-core/audio-translate-batches/${batchId}/items/${itemId}/retry`,
      payload
        ? {
            source_lang: payload.sourceLang,
            target_lang: payload.targetLang,
            return_timestamp: payload.returnTimestamp ?? false,
            denoise_audio: payload.denoiseAudio ?? false,
          }
        : undefined,
    );
  },

  async exportAudioTranslateBatchItem(
    batchId: string,
    itemId: string,
    format: TranslateExportFormat,
  ): Promise<Blob> {
    const response = await axiosInstance.get<Blob>(
      `/ai-core/audio-translate-batches/${batchId}/items/${itemId}/export`,
      {
        params: { format },
        responseType: "blob",
      },
    );

    return response.data;
  },

  async exportAudioTranslateBatch(
    batchId: string,
    format: TranslateExportFormat,
  ): Promise<Blob> {
    const response = await axiosInstance.get<Blob>(
      `/ai-core/audio-translate-batches/${batchId}/export`,
      {
        params: { format },
        responseType: "blob",
      },
    );

    return response.data;
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
        source_lang: payload.sourceLang,
        source_file_type: payload.sourceFileType,
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
      source_lang: payload.sourceLang,
      source_file_type: payload.sourceFileType,
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
        source_lang: payload.sourceLang,
        source_file_type: payload.sourceFileType,
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
      source_lang: payload.sourceLang,
      source_file_type: payload.sourceFileType,
    });

    return unwrapApiResponse(response.data);
  },

  async getTranslationHistory(
    params: TranslationHistoryFilter,
  ): Promise<TranslationHistoryResponse> {
    const response = await axiosInstance.get<
      ApiResponse<TranslationHistoryResponse>
    >("/translate/history", {
      params,
    });

    return unwrapApiResponse(response.data);
  },

  async updateTranslationHistory(
    recordId: string,
    payload: UpdateTranslationHistoryRequest,
  ): Promise<TranslationHistoryRecord> {
    const response = await axiosInstance.patch<
      ApiResponse<TranslationHistoryRecord>
    >(`/translate/history/${recordId}`, {
      translated_text: payload.translatedText,
    });

    return unwrapApiResponse(response.data);
  },
};
