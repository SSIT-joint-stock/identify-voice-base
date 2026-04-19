import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { AudioPurpose, audio_files } from '@prisma/client';
import * as mm from 'music-metadata';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

import storageConfig from '@/config/storage.config';
import { PrismaService } from '@/database/prisma/prisma.service';
import { StorageService } from '@/module/storage/service/storage.service';

/** Map AudioPurpose → thư mục con trong storage root */
const PURPOSE_DIR: Record<AudioPurpose, string> = {
  [AudioPurpose.ENROLL]: 'voices',
  [AudioPurpose.IDENTIFY]: 'identify',
  [AudioPurpose.UPDATE_VOICE]: 'update-voice',
};

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(storageConfig.KEY)
    private readonly cfg: ConfigType<typeof storageConfig>,
  ) {}

  // ─────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────

  async uploadOne(
    file: Express.Multer.File,
    purpose: AudioPurpose,
    uploadedBy: string,
  ): Promise<audio_files> {
    return this._processFile(file, purpose, uploadedBy);
  }

  async uploadMany(
    files: Express.Multer.File[],
    purpose: AudioPurpose,
    uploadedBy: string,
  ): Promise<audio_files[]> {
    return Promise.all(
      files.map((f) => this._processFile(f, purpose, uploadedBy)),
    );
  }

  /**
   * Xóa file khỏi storage và soft-delete record trong DB.
   */
  async deleteFile(audioFileId: string): Promise<void> {
    const record = await this.prisma.audio_files.findFirst({
      where: { id: audioFileId, deleted_at: null },
    });

    if (!record) {
      throw new NotFoundException(
        `Không tìm thấy file audio với id: ${audioFileId}`,
      );
    }

    // Delegate xóa file sang StorageService bằng storageKey
    await this.storage.delete(record.file_path);

    // Soft-delete record trong DB
    await this.prisma.audio_files.update({
      where: { id: audioFileId },
      data: { deleted_at: new Date() },
    });

    this.logger.log(`Deleted audio file: ${audioFileId}`);
  }

  async updateDuration(
    audioFileId: string,
    durationSec: number,
  ): Promise<void> {
    await this.prisma.audio_files.update({
      where: { id: audioFileId },
      data: { duration_sec: durationSec },
    });
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  /**
   * Luồng xử lý một file:
   *   validate (buffer) → save (storage stream) → INSERT DB
   */
  private async _processFile(
    file: Express.Multer.File,
    purpose: AudioPurpose,
    uploadedBy: string,
  ): Promise<audio_files> {
    if (!file) {
      throw new UnprocessableEntityException('Vui lòng cung cấp file audio');
    }

    if (!this.cfg.isMimeAllowed(file.mimetype)) {
      throw new UnprocessableEntityException(
        `Định dạng file không được hỗ trợ: ${file.mimetype}`,
      );
    }

    if (!file.buffer) {
      throw new InternalServerErrorException(
        'File buffer is missing (check Multer configuration)',
      );
    }

    const fileId = uuidv4();
    const ext = this.cfg.getExtension(file.mimetype);
    const destDir = PURPOSE_DIR[purpose];
    const fileName = `${fileId}.${ext}`;

    const durationSec = await this._getDuration(
      file.buffer,
      purpose,
      file.mimetype,
      file.size,
    );

    const fileStream = Readable.from(file.buffer);
    const { storageKey } = await this.storage
      .save(fileStream, destDir, fileName)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Lỗi ghi file xuống storage: ${msg}`);
        throw new InternalServerErrorException('Lỗi hệ thống khi lưu file');
      });

    // ── INSERT audio_files ──
    try {
      const record = await this.prisma.audio_files.create({
        data: {
          id: fileId,
          file_path: storageKey, // DB lưu storageKey (relative path hoặc S3 key)
          file_name: file.originalname,
          mime_type: file.mimetype,
          size_bytes: file.size,
          duration_sec: durationSec,
          purpose,
          uploaded_by: uploadedBy,
        },
      });

      this.logger.log(
        `Uploaded audio [${purpose}]: ${storageKey} (${durationSec.toFixed(1)}s)`,
      );
      return record;
    } catch (dbErr: unknown) {
      // Rollback: xóa file đã lưu nếu INSERT lỗi
      await this.storage.delete(storageKey);
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      this.logger.error(`Lỗi INSERT audio_files (rollback): ${msg}`);
      throw new InternalServerErrorException('Lỗi hệ thống khi lưu file');
    }
  }

  /**
   * Đọc duration thực tế bằng music-metadata trực tiếp từ Buffer.
   */
  private async _getDuration(
    buffer: Buffer,
    purpose: AudioPurpose,
    mimeType?: string,
    size?: number,
  ): Promise<number> {
    let durationSec: number;

    try {
      const metadata = await mm.parseBuffer(buffer, {
        mimeType,
        size,
      });
      durationSec = metadata.format.duration ?? 0;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`music-metadata parse lỗi: ${msg}`);
      throw new InternalServerErrorException(
        'Không thể đọc thông tin file audio',
      );
    }

    return durationSec;
  }
}
