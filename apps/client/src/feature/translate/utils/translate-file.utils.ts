import {
  AUDIO_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  MAX_TRANSLATE_FILE_SIZE_BYTES,
  MAX_TRANSLATE_FILE_SIZE_MB,
  OCR_LANGUAGES,
  SPEECH_LANGUAGES,
  TRANSLATION_LANGUAGES,
} from "../constants/translate.constants";
import type {
  OcrPageResult,
  SelectedTranslateFile,
  SpeechSegment,
  TranslateFileKind,
} from "../types/translate.types";

const AUDIO_MIME_PREFIX = "audio/";
const IMAGE_MIME_PREFIX = "image/";

const AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/vnd.wave",
  "audio/mp4",
  "video/mp4",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
] as const;

const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

export function detectTranslateFileKind(file: File): TranslateFileKind | null {
  const mimeType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);

  if (
    mimeType.startsWith(AUDIO_MIME_PREFIX) ||
    AUDIO_MIME_TYPES.includes(mimeType as (typeof AUDIO_MIME_TYPES)[number]) ||
    AUDIO_EXTENSIONS.includes(extension as (typeof AUDIO_EXTENSIONS)[number])
  ) {
    return "audio";
  }

  if (
    mimeType.startsWith(IMAGE_MIME_PREFIX) ||
    IMAGE_EXTENSIONS.includes(extension as (typeof IMAGE_EXTENSIONS)[number])
  ) {
    return "image";
  }

  if (
    DOCUMENT_MIME_TYPES.includes(
      mimeType as (typeof DOCUMENT_MIME_TYPES)[number],
    ) ||
    DOCUMENT_EXTENSIONS.includes(
      extension as (typeof DOCUMENT_EXTENSIONS)[number],
    )
  ) {
    return "document";
  }

  return null;
}

export function validateTranslateFile(file: File): SelectedTranslateFile {
  if (file.size <= 0) {
    throw new Error("Tệp không hợp lệ hoặc đang rỗng.");
  }

  if (file.size > MAX_TRANSLATE_FILE_SIZE_BYTES) {
    throw new Error(`Dung lượng tối đa là ${MAX_TRANSLATE_FILE_SIZE_MB} MB.`);
  }

  const kind = detectTranslateFileKind(file);
  if (!kind) {
    throw new Error("Chỉ hỗ trợ audio, ảnh, PDF, DOCX hoặc TXT.");
  }

  return { file, kind };
}

export function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(0)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function getTranslateFileKindLabel(kind: TranslateFileKind) {
  if (kind === "audio") return "Audio";
  if (kind === "image") return "Ảnh";
  return "Tài liệu";
}

export function getLanguageLabel(value: string | undefined) {
  if (!value) return "";

  const language =
    [...SPEECH_LANGUAGES, ...OCR_LANGUAGES, ...TRANSLATION_LANGUAGES].find(
      (item) => item.value === value,
    ) ?? null;

  return language?.label ?? value;
}

export function getTranscriptText(transcript: string | SpeechSegment[]) {
  if (typeof transcript === "string") return transcript.trim();

  return transcript
    .map((segment) => {
      const text = segment.text.trim();
      if (!text) return "";

      return `[${formatAudioTime(segment.start)} - ${formatAudioTime(segment.end)}] ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

export function getOcrText(results: string | OcrPageResult[]) {
  if (typeof results === "string") return results.trim();

  return results
    .flatMap((page) => {
      if (page.text?.trim()) return [page.text.trim()];
      return (page.result ?? [])
        .map((item) => item.text?.trim() ?? "")
        .filter(Boolean);
    })
    .join("\n")
    .trim();
}
