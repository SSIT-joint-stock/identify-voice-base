import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { AudioPurpose, Prisma } from '@prisma/client';
import * as path from 'path';

import storageConfig from '@/config/storage.config';
import { PrismaService } from '@/database/prisma/prisma.service';
import { UploadService } from '@/module/upload/service/upload.service';

import { AiCoreService } from '@/module/ai-core/service/ai-core.service';
import { EnrollVoiceDto } from '../dto/enroll-voice.dto';

@Injectable()
export class EnrollVoiceUseCase {
  private readonly logger = new Logger(EnrollVoiceUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly core: AiCoreService,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(
    file: Express.Multer.File,
    dto: EnrollVoiceDto,
    operatorId: string,
  ) {
    this.logger.log(`Bắt đầu quy trình Enroll cho người dùng: ${dto.name}`);

    // 1. Lưu file audio (Tầng 1 & 2 đã được Multer/Pipes xử lý sơ bộ)
    // UploadService sẽ thực hiện validate MimeType, Size và Duration (Tầng 3)
    const audioFile = await this.uploadService.uploadOne(
      file,
      AudioPurpose.ENROLL,
      operatorId,
    );

    let voiceId: string;

    try {
      // 2. Gửi audio sang AI Service để trích xuất embedding và lấy voice_id (Point ID)
      // Lưu ý: AiService dùng absolute path để stream file từ đĩa (nếu dùng Local Driver)
      // Hoặc nó stream trực tiếp nếu driver là S3 (cần cải tiến AiService sau này)
      // Hiện tại LocalStorageDriver ghi file vào STORAGE_ROOT_DIR.
      const absolutePath = path.resolve(
        process.cwd(),
        this.config.rootDir,
        audioFile.file_path,
      );

      const aiResponse = await this.core.uploadVoice(
        absolutePath,
        dto.name,
        audioFile.mime_type,
      );

      voiceId = aiResponse.voice_id;

      if (!voiceId) {
        throw new InternalServerErrorException(
          'AI Service không trả về voice_id',
        );
      }
    } catch (error) {
      // ROLLBACK: Xóa file audio nếu AI Service thất bại
      await this.uploadService.deleteFile(audioFile.id).catch((delErr) => {
        this.logger.error(`Rollback file thất bại: ${delErr.message}`);
      });

      if (
        error instanceof UnprocessableEntityException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new UnprocessableEntityException(
        error.message || 'AI Service từ chối audio hoặc không phản hồi',
      );
    }

    // Tạo audio_url hoàn chỉnh
    const audioUrl = `${this.config.cdnUrl}/${audioFile.file_path}`;

    // 3. Thực hiện Prisma Transaction để lưu Metadata và VoiceRecord
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Tạo User record với ID trùng với voice_id từ AI
        const user = await tx.users.create({
          data: {
            id: voiceId, // Sử dụng voice_id làm ID nếu nó là UUID hợp lệ
            name: dto.name,
            citizen_identification: dto.citizen_identification,
            phone_number: dto.phone_number,
            hometown: dto.hometown,
            job: dto.job,
            passport: dto.passport,
            criminal_record: dto.criminal_record
              ? (JSON.parse(dto.criminal_record) as Prisma.JsonArray)
              : Prisma.JsonNull,
            audio_url: audioUrl, // Lưu URL audio vào hồ sơ user
          },
        });

        // Tạo Voice Record bản active ban đầu (version 1)
        const voiceRecord = await tx.voice_records.create({
          data: {
            user_id: user.id,
            user_name: user.name, // Snapshot name
            voice_id: voiceId,
            audio_file_id: audioFile.id,
          },
        });

        return { user, voiceRecord };
      });

      this.logger.log(`Enroll thành công: ${voiceId}`);

      return {
        voice_id: voiceId,
        user_id: result.user.id,
        audio_url: audioUrl,
        name: result.user.name,
        enrolled_at: result.voiceRecord.created_at,
      };
    } catch (dbError) {
      // ROLLBACK: Xóa file và báo lỗi nếu DB transaction thất bại
      await this.uploadService.deleteFile(audioFile.id).catch(() => {});

      this.logger.error(`Lỗi Database Transaction: ${dbError.message}`);
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi lưu thông tin người dùng',
      );
    }
  }
}
