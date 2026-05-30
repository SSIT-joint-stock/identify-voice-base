import { registerAs } from '@nestjs/config';

const normalizeUrl = (value: string) => value.replace(/\/$/, '');
const normalizeOcrBaseUrl = (value: string) =>
  normalizeUrl(value).replace(/\/ocr$/i, '');
const getNumber = (value: string | undefined, fallback: number) =>
  parseInt(value || String(fallback), 10);

export default registerAs('ai', () => {
  const identifyUrl =
    process.env.AI_CORE_IDENTIFY_URL || 'http://localhost:5000';
  const ocrUrl =
    process.env.AI_CORE_OCR_URL ||
    process.env.AI_CORE_OCR_URl ||
    'http://localhost:8003';

  return {
    url: normalizeUrl(identifyUrl),
    voice: {
      url: normalizeUrl(identifyUrl),
    },
    audioNormalize: {
      timeoutMs: getNumber(process.env.AUDIO_NORMALIZE_TIMEOUT_MS, 15000),
    },
    ocr: {
      url: normalizeOcrBaseUrl(ocrUrl),
      pdfBatchSize: getNumber(process.env.AI_CORE_OCR_PDF_BATCH_SIZE, 3),
    },
    speechToText: {
      url: normalizeUrl(
        process.env.AI_CORE_SPEECH_TO_TEXT_URL || 'http://localhost:8996',
      ),
    },
    filterNoise: {
      url: normalizeUrl(
        process.env.AI_CORE_FILTER_NOISE_URL ||
          'http://localhost:1113/filter_noise/filter_noise_segment',
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
      chunkCharacterLimit: getNumber(
        process.env.AI_CORE_TRANSLATION_CHUNK_CHARACTER_LIMIT,
        1200,
      ),
    },
  };
});
