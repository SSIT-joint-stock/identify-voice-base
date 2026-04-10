import type { Readable } from 'stream';

import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';

import type {
  StorageDriver,
  StorageSaveResult,
} from '../interfaces/storage-driver.interface';
import { STORAGE_DRIVER_TOKEN } from '../interfaces/storage-driver.interface';

/**
 * StorageService — application-layer facade cho storage.
 *
 * UploadService chỉ phụ thuộc vào StorageService, không quan tâm driver nào (Local/S3).
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(STORAGE_DRIVER_TOKEN)
    private readonly driver: StorageDriver,
  ) {}

  /** Khởi tạo thư mục / bucket khi app boot */
  async onModuleInit(): Promise<void> {
    const subDirs = ['voices', 'identify', 'update-voice'];
    try {
      if (this.driver.onInit) {
        await this.driver.onInit(subDirs);
      }
      this.logger.log('🗄️  Storage initialized successfully');
    } catch (err: any) {
      this.logger.error(`Storage initialization failed: ${err?.message}`);
    }
  }

  /**
   * Lưu file vào storage bằng Stream.
   */
  async save(
    stream: Readable,
    destDir: string,
    fileName: string,
  ): Promise<StorageSaveResult> {
    try {
      return await this.driver.save(stream, destDir, fileName);
    } catch (err) {
      this.logger.error(`Storage SAVE failed: ${err?.message}`);
      throw new ServiceUnavailableException('Storage service is unavailable');
    }
  }

  /**
   * Xóa file khỏi storage.
   */
  async delete(storageKey: string): Promise<void> {
    if (!storageKey) return;
    try {
      await this.driver.delete(storageKey);
    } catch (err: any) {
      this.logger.warn(`Storage DELETE failed: ${err?.message}`);
    }
  }

  /**
   * Kiểm tra file tồn tại.
   */
  async exists(storageKey: string): Promise<boolean> {
    if (!storageKey) return false;
    try {
      return await this.driver.exists(storageKey);
    } catch {
      return false;
    }
  }

  /**
   * Truy xuất file dưới dạng ReadStream.
   */
  async getReadStream(storageKey: string): Promise<Readable> {
    if (!storageKey) {
      throw new Error('storageKey rỗng');
    }
    if (!this.driver.getReadStream) {
      throw new ServiceUnavailableException(
        'Storage driver chưa hỗ trợ getReadStream',
      );
    }
    return this.driver.getReadStream(storageKey);
  }
}
