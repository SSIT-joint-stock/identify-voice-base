export const OCR_LANGUAGES = ['vi', 'en', 'de', 'fr', 'ja', 'ko'] as const;

export type OcrLanguage = (typeof OCR_LANGUAGES)[number];

export const SPEECH_TO_TEXT_LANGUAGES = [
  'vi',
  'en',
  'zh',
  'ja',
  'ko',
  'fr',
  'ru',
  'de',
] as const;

export type SpeechToTextLanguage = (typeof SPEECH_TO_TEXT_LANGUAGES)[number];

export const TRANSLATION_LANGUAGES = [
  'zh',
  'zh-Hant',
  'yue',
  'en',
  'fr',
  'de',
  'it',
  'pt',
  'es',
  'nl',
  'pl',
  'cs',
  'uk',
  'ru',
  'ar',
  'fa',
  'he',
  'hi',
  'bn',
  'ur',
  'gu',
  'te',
  'mr',
  'ta',
  'ja',
  'ko',
  'th',
  'vi',
  'ms',
  'id',
  'tl',
  'km',
  'my',
  'lo',
  'bo',
  'kk',
  'mn',
  'ug',
] as const;

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];
