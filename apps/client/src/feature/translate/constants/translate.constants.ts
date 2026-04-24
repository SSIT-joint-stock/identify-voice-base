export const AUTO_LANGUAGE = "auto";

export const MAX_TRANSLATE_FILE_SIZE_MB = 50;
export const MAX_TRANSLATE_FILE_SIZE_BYTES =
  MAX_TRANSLATE_FILE_SIZE_MB * 1024 * 1024;

export const AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".m4a",
  ".webm",
  ".ogg",
  ".flac",
] as const;

export const DOCUMENT_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;

export const IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
] as const;

export const ACCEPTED_TRANSLATE_FILE_INPUT =
  "audio/*,image/*,.pdf,.docx,.txt,.mp3,.wav,.m4a,.webm,.ogg,.flac";

export const SPEECH_LANGUAGES = [
  { value: AUTO_LANGUAGE, label: "Tự động" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "Tiếng Anh" },
  { value: "zh", label: "Tiếng Trung" },
  { value: "ja", label: "Tiếng Nhật" },
  { value: "ko", label: "Tiếng Hàn" },
  { value: "fr", label: "Tiếng Pháp" },
  { value: "ru", label: "Tiếng Nga" },
  { value: "de", label: "Tiếng Đức" },
] as const;

export const OCR_LANGUAGES = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "Tiếng Anh" },
  { value: "de", label: "Tiếng Đức" },
  { value: "fr", label: "Tiếng Pháp" },
  { value: "ja", label: "Tiếng Nhật" },
  { value: "ko", label: "Tiếng Hàn" },
] as const;

export const LIVE_TRANSLATE_SOURCE_LANGUAGE_OPTIONS = [
  {
    value: AUTO_LANGUAGE,
    label: "Tự động nhận diện",
  },
  ...OCR_LANGUAGES,
] as const;

export const TRANSLATION_LANGUAGES = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "Tiếng Anh" },
  { value: "zh", label: "Tiếng Trung giản thể" },
  { value: "zh-Hant", label: "Tiếng Trung phồn thể" },
  { value: "yue", label: "Tiếng Quảng Đông" },
  { value: "fr", label: "Tiếng Pháp" },
  { value: "de", label: "Tiếng Đức" },
  { value: "it", label: "Tiếng Ý" },
  { value: "pt", label: "Tiếng Bồ Đào Nha" },
  { value: "es", label: "Tiếng Tây Ban Nha" },
  { value: "nl", label: "Tiếng Hà Lan" },
  { value: "pl", label: "Tiếng Ba Lan" },
  { value: "cs", label: "Tiếng Séc" },
  { value: "uk", label: "Tiếng Ukraina" },
  { value: "ru", label: "Tiếng Nga" },
  { value: "ar", label: "Tiếng Ả Rập" },
  { value: "fa", label: "Tiếng Ba Tư" },
  { value: "he", label: "Tiếng Do Thái" },
  { value: "hi", label: "Tiếng Hindi" },
  { value: "bn", label: "Tiếng Bengali" },
  { value: "ur", label: "Tiếng Urdu" },
  { value: "gu", label: "Tiếng Gujarat" },
  { value: "te", label: "Tiếng Telugu" },
  { value: "mr", label: "Tiếng Marathi" },
  { value: "ta", label: "Tiếng Tamil" },
  { value: "ja", label: "Tiếng Nhật" },
  { value: "ko", label: "Tiếng Hàn" },
  { value: "th", label: "Tiếng Thái" },
  { value: "ms", label: "Tiếng Mã Lai" },
  { value: "id", label: "Tiếng Indonesia" },
  { value: "tl", label: "Tiếng Filipino" },
  { value: "km", label: "Tiếng Khmer" },
  { value: "my", label: "Tiếng Myanmar" },
  { value: "lo", label: "Tiếng Lào" },
  { value: "bo", label: "Tiếng Tây Tạng" },
  { value: "kk", label: "Tiếng Kazakh" },
  { value: "mn", label: "Tiếng Mông Cổ" },
  { value: "ug", label: "Tiếng Duy Ngô Nhĩ" },
] as const;
