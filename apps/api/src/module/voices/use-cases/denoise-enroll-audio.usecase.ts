import storageConfig from '@/config/storage.config';
import { PrismaService } from '@/database/prisma/prisma.service';
import { AiCoreService } from '@/module/ai-core/service/ai-core.service';
import { StorageService } from '@/module/storage/service/storage.service';
import { UploadService } from '@/module/upload/service/upload.service';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { auth_accounts, AudioPurpose, Role } from '@prisma/client';
import { readFile, stat, unlink } from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';

@Injectable()
export class DenoiseEnrollAudioUseCase {
  private readonly logger = new Logger(DenoiseEnrollAudioUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly uploadService: UploadService,
    private readonly aiCoreService: AiCoreService,
    @Inject(storageConfig.KEY)
    private readonly storageCfg: ConfigType<typeof storageConfig>,
  ) {}

  async execute(
    userId: string,
    requester: auth_accounts,
    filteredEnrollAudio?: Express.Multer.File,
  ) {
    const activeVoice = await this.prisma.voice_records.findFirst({
      where: {
        user_id: userId,
        is_active: true,
        ...(requester.role !== Role.ADMIN && {
          audio_file: {
            uploaded_by: requester.id,
          },
        }),
      },
      include: {
        audio_file: true,
        user: true,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!activeVoice) {
      throw new NotFoundException(
        'Người dùng không có voice record đang active. Không thể lọc ồn audio đăng ký.',
      );
    }

    let nextAudioFileId: string | null = null;

    try {
      const filteredFile =
        filteredEnrollAudio ??
        (await this.filterActiveEnrollAudio(activeVoice));

      const nextAudioFile = await this.uploadService.uploadOne(
        filteredFile,
        AudioPurpose.UPDATE_VOICE,
        requester.id,
      );
      nextAudioFileId = nextAudioFile.id;

      const nextAudioPath = path.resolve(
        process.cwd(),
        this.storageCfg.rootDir,
        nextAudioFile.file_path,
      );

      await this.aiCoreService.uploadVoice(
        nextAudioPath,
        activeVoice.voice_id,
        nextAudioFile.mime_type,
      );

      const nextAudioUrl = `${this.storageCfg.cdnUrl}/${nextAudioFile.file_path}`;

      const nextVoiceRecord = await this.prisma.$transaction(async (tx) => {
        await tx.voice_records.update({
          where: { id: activeVoice.id },
          data: { is_active: false },
        });

        const createdVoiceRecord = await tx.voice_records.create({
          data: {
            user_id: activeVoice.user_id,
            user_name: activeVoice.user_name ?? activeVoice.user.name ?? null,
            user_email: activeVoice.user_email,
            voice_id: activeVoice.voice_id,
            audio_file_id: nextAudioFile.id,
            is_active: true,
          },
        });

        await tx.users.update({
          where: { id: activeVoice.user_id },
          data: {
            audio_url: nextAudioUrl,
          },
        });

        await tx.voice_update_logs.create({
          data: {
            voice_record_id: createdVoiceRecord.id,
            voice_id: activeVoice.voice_id,
            audio_file_id: nextAudioFile.id,
            updated_by: requester.id,
          },
        });

        return createdVoiceRecord;
      });

      this.logger.log(
        `Denoised enroll audio for user ${userId} / voice_id ${activeVoice.voice_id}`,
      );

      return {
        user_id: activeVoice.user_id,
        voice_id: activeVoice.voice_id,
        voice_record_id: nextVoiceRecord.id,
        audio_file_id: nextAudioFile.id,
        audio_url: nextAudioUrl,
        updated_at: nextVoiceRecord.created_at,
      };
    } catch (error) {
      if (nextAudioFileId) {
        await this.uploadService.deleteFile(nextAudioFileId).catch(() => {});
      }

      if (
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Không thể lọc ồn và cập nhật audio đăng ký: ${message}`,
      );
    }
  }

  private async filterActiveEnrollAudio(activeVoice: {
    audio_file: {
      file_path: string;
      file_name: string;
      mime_type: string;
    };
  }) {
    const sourceAudio = activeVoice.audio_file;
    const sourceBuffer = await this.streamToBuffer(
      await this.storage.getReadStream(sourceAudio.file_path),
    );

    const filteredAudio = await this.aiCoreService.filterNoise({
      buffer: sourceBuffer,
      originalname: sourceAudio.file_name,
      mimetype: sourceAudio.mime_type,
      size: sourceBuffer.byteLength,
    } as Express.Multer.File);

    const filteredBuffer = await readFile(filteredAudio.path);
    const filteredStat = await stat(filteredAudio.path);

    await this.cleanupFilteredAudio(filteredAudio.path);

    return {
      buffer: filteredBuffer,
      originalname: filteredAudio.filename,
      mimetype: filteredAudio.mimeType,
      size: filteredStat.size,
    } as Express.Multer.File;
  }

  private async streamToBuffer(stream: Readable) {
    const chunks: Buffer[] = [];

    for await (const chunk of stream as AsyncIterable<Buffer | string>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  private async cleanupFilteredAudio(filePath: string | null) {
    if (!filePath) return;
    await unlink(filePath).catch(() => {});
  }
}
