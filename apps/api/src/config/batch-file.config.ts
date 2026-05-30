import { registerAs } from '@nestjs/config';

const getNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getBatchFileConfig = () => {
  const storageCleanupDelayMs = getNumber(
    process.env.BATCH_FILE_STORAGE_CLEANUP_DELAY_MS,
    6 * 60 * 60 * 1000,
  );
  const ttlSeconds = Math.max(
    getNumber(process.env.BATCH_FILE_TTL_SECONDS, 0),
    Math.ceil(storageCleanupDelayMs / 1000) + 60 * 60,
  );

  return {
    storageDir: process.env.BATCH_FILE_STORAGE_DIR || 'batch-file',
    ttlSeconds,
    workerConcurrency: getNumber(process.env.BATCH_FILE_WORKER_CONCURRENCY, 1),
    extractionConcurrency: getNumber(
      process.env.BATCH_FILE_EXTRACTION_CONCURRENCY ??
        process.env.AUDIO_BATCH_S2T_CONCURRENCY,
      2,
    ),
    ocrConcurrency: getNumber(process.env.BATCH_FILE_OCR_CONCURRENCY, 1),
    translateConcurrency: getNumber(
      process.env.BATCH_FILE_TRANSLATE_CONCURRENCY ??
        process.env.AUDIO_BATCH_TRANSLATE_CONCURRENCY,
      3,
    ),
    storageCleanupDelayMs,
  };
};

export default registerAs('batchFile', getBatchFileConfig);
