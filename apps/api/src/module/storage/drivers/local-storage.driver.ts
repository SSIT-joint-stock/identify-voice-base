import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import storageConfig from '@/config/storage.config';
import {
  StorageDriver,
  StorageSaveResult,
} from '../interfaces/storage-driver.interface';

/**
 * LocalStorageDriver — lưu file vào local disk bằng Stream.
 */
@Injectable()
export class LocalStorageDriver implements StorageDriver {
  private readonly logger = new Logger(LocalStorageDriver.name);
  private readonly rootDir: string;

  constructor(
    @Inject(storageConfig.KEY)
    private readonly cfg: ConfigType<typeof storageConfig>,
  ) {
    this.rootDir = path.resolve(process.cwd(), cfg.rootDir);
  }

  /**
   * Lưu stream vào disk.
   */
  async save(
    stream: Readable,
    destDir: string,
    fileName: string,
  ): Promise<StorageSaveResult> {
    const targetDir = path.join(this.rootDir, destDir);
    const storageKey = path.join(destDir, fileName);
    const fullPath = path.join(this.rootDir, storageKey);

    // Đảm bảo thư mục đích tồn tại
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Ghi stream xuống file bằng pipeline (tự động handle error/cleanup)
    const writeStream = fs.createWriteStream(fullPath);
    try {
      await pipeline(stream, writeStream);
    } catch (err) {
      this.logger.error(`Lỗi khi ghi stream xuống disk: ${fullPath}`);
      throw err;
    }

    this.logger.debug(`Saved file to disk: ${storageKey}`);
    return { storageKey };
  }

  /**
   * Xóa file theo storageKey (đường dẫn tương đối).
   */
  async delete(storageKey: string): Promise<void> {
    const fullPath = path.join(this.rootDir, storageKey);
    try {
      await fs.promises.unlink(fullPath);
      this.logger.debug(`Deleted file: ${storageKey}`);
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        this.logger.warn(
          `Could not delete file: ${storageKey} — ${err?.message}`,
        );
      }
    }
  }

  /**
   * Kiểm tra file tồn tại.
   */
  async exists(storageKey: string): Promise<boolean> {
    const fullPath = path.join(this.rootDir, storageKey);
    try {
      await fs.promises.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Khởi tạo các thư mục (thay thế ensureDirectories).
   */
  async onInit(subDirs: string[]): Promise<void> {
    for (const dir of subDirs) {
      const fullPath = path.join(this.rootDir, dir);
      await fs.promises.mkdir(fullPath, { recursive: true });
      this.logger.log(`✅ Ensured directory: ${fullPath}`);
    }
  }
}
