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
