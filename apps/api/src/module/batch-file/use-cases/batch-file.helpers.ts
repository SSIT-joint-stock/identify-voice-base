import { BatchFileSourceType } from '../types/batch-file.types';

export class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {
    this.limit = Math.max(1, limit);
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();

    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire() {
    if (this.active < this.limit) {
      this.active += 1;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private release() {
    this.active -= 1;
    const next = this.queue.shift();
    next?.();
  }
}

export function getSourceFileType(
  file: Express.Multer.File,
): BatchFileSourceType {
  if (isAudioFile(file)) return 'audio';
  if (isImageFile(file)) return 'image';
  return 'document';
}

export function isAudioFile(file: Express.Multer.File) {
  return (
    file.mimetype.startsWith('audio/') ||
    file.mimetype.startsWith('video/') ||
    /\.(mp3|wav|m4a|mp4|webm|ogg|flac)$/i.test(file.originalname)
  );
}

export function isImageFile(file: Express.Multer.File) {
  return (
    file.mimetype.startsWith('image/') ||
    /\.(png|jpe?g)$/i.test(file.originalname)
  );
}

export function isPdfFile(file: Express.Multer.File) {
  return (
    file.mimetype === 'application/pdf' ||
    file.originalname.toLowerCase().endsWith('.pdf')
  );
}

export function withoutExtension(filename: string) {
  return filename.replace(/\.[^.]+$/, '').trim() || 'ban-dich-file';
}

export function normalizeUploadedFileName(filename: string) {
  if (!/[ÃÂÄÅÆáºá»]/.test(filename)) return filename;

  const decoded = Buffer.from(filename, 'latin1').toString('utf8');
  return decoded.includes('�') ? filename : decoded;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
