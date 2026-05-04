export type TranslateMode = "translate" | "summarize";

export type TranslateFileKind = "audio" | "document" | "image";

export interface SpeechSegment {
  start: number;
  end: number;
  text: string;
}

export interface SpeechToTextResponse {
  transcript: string | SpeechSegment[];
  language?: string;
}

export interface TranslateResponse {
  success?: boolean;
  original_text?: string;
  translated_text: string;
  target_lang: string;
}

export type TranslateJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface TranslateJobCreateResponse {
  job_id: string;
}

export type ExtractionJobMode = "ocr" | "speech-to-text";

export interface ExtractionJobCreateResponse {
  job_id: string;
}

export interface ExtractionJobResponse<T = unknown> {
  job_id: string;
  status: TranslateJobStatus;
  progress: number;
  mode: ExtractionJobMode;
  result?: T;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface TranslateJobResponse {
  job_id: string;
  status: TranslateJobStatus;
  progress: number;
  mode: TranslateMode;
  result?: TranslateResponse;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface DetectLanguageResponse {
  success?: boolean;
  detected_languages?: string | string[];
}

export interface OcrTextBox {
  text?: string;
}

export interface OcrPageResult {
  page?: number;
  result?: OcrTextBox[];
  text?: string;
}

export interface OcrResponse {
  results: string | OcrPageResult[];
}

export interface SelectedTranslateFile {
  file: File;
  kind: TranslateFileKind;
}

export type TranslationHistoryMode = "TRANSLATE" | "SUMMARIZE";

export interface TranslationHistoryFilter {
  page?: number;
  page_size?: 10 | 25 | 50;
  from_date?: string;
  to_date?: string;
  source_lang?: string;
  target_lang?: string;
}

export interface TranslationHistoryRecord {
  id: string;
  source_text: string;
  translated_text: string;
  source_lang?: string | null;
  target_lang: string;
  source_file_type?: string | null;
  mode: TranslationHistoryMode;
  created_at: string;
  operator: {
    id: string;
    email?: string;
    username?: string | null;
    role: string;
  };
}

export interface TranslationHistoryResponse {
  items: TranslationHistoryRecord[];
  stats: {
    total: number;
    today_count: number;
    by_target_lang: { target_lang: string; count: number }[];
    by_mode: { mode: TranslationHistoryMode; count: number }[];
  };
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}
