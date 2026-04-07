import { registerAs } from '@nestjs/config';

/**
 * Mapped extensions for supported audio mime types.
 * This ensures we don't hardcode them in the services.
 */
const AUDIO_MIME_MAP: Record<string, string> = {
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'video/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/ogg': 'ogg',
};

/**
 * Storage & Asset configuration
 */
export default registerAs('storage', () => {
  const allowedMimes = (
    process.env.STORAGE_ALLOWED_MIMES ?? 'audio/mpeg,audio/wav'
  ).split(',');

  return {
    driver: process.env.STORAGE_DRIVER ?? 'local',
    rootDir: process.env.STORAGE_ROOT_DIR ?? './storage',
    publicDir: process.env.STORAGE_PUBLIC_DIR ?? 'public',
    privateDir: process.env.STORAGE_PRIVATE_DIR ?? 'private',
    tempDir: process.env.STORAGE_TEMP_DIR ?? 'temp',
    cdnUrl: (
      process.env.STORAGE_CDN_URL ?? 'http://localhost:3000/cdn'
    ).replace(/\/$/, ''),
    maxSize: parseInt(process.env.STORAGE_MAX_SIZE ?? '52428800', 10),
    allowedMimes,

    /**
     * Helper to get extension from mime type.
     * Returns 'bin' as fallback.
     */
    getExtension: (mimeType: string): string => {
      return AUDIO_MIME_MAP[mimeType] ?? 'bin';
    },

    /**
     * Check if mime type is allowed based on config.
     */
    isMimeAllowed: (mimeType: string): boolean => {
      return allowedMimes.includes(mimeType);
    },
  };
});
