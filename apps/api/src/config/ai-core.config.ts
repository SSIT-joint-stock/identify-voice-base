import { registerAs } from '@nestjs/config';

const normalizeUrl = (value: string) => value.replace(/\/$/, '');
const getNumber = (value: string | undefined, fallback: number) =>
  parseInt(value || String(fallback), 10);

const identifyUrl = process.env.AI_CORE_IDENTIFY_URL || 'http://localhost:5000';
const ocrUrl =
  process.env.AI_CORE_OCR_URL ||
  process.env.AI_CORE_OCR_URl ||
  'http://localhost:8003';
const requestTimeout = getNumber(process.env.AI_SERVICE_TIMEOUT, 30000);

export default registerAs('ai', () => ({
  url: normalizeUrl(identifyUrl),
  timeout: requestTimeout,
  voice: {
    url: normalizeUrl(identifyUrl),
    timeout: requestTimeout,
  },
  audioNormalize: {
    timeoutMs: getNumber(process.env.AUDIO_NORMALIZE_TIMEOUT_MS, 15000),
  },
  ocr: {
    url: normalizeUrl(ocrUrl),
  },
  speechToText: {
    url: normalizeUrl(
      process.env.AI_CORE_SPEECH_TO_TEXT_URL || 'http://localhost:8996',
    ),
  },
  translation: {
    url: normalizeUrl(
      process.env.AI_CORE_TRANSLATION_URL || 'http://localhost:8505',
    ),
    chunkWordLimit: getNumber(
      process.env.AI_CORE_TRANSLATION_CHUNK_WORD_LIMIT,
      1000,
    ),
  },
}));
