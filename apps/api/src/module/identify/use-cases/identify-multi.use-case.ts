import {
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { AudioPurpose, SessionType, users, UserSource } from '@prisma/client';
import * as path from 'path';

import storageConfig from '@/config/storage.config';
import { PrismaService } from '@/database/prisma/prisma.service';
import { AiCoreService } from '@/module/ai-core/ai-core.service';
import { AiCoreMultiIdentifyResponse } from '@/module/ai-core/dto/ai-core-response.dto';
import { SessionsRepository } from '@/module/sessions/sessions.repository';
import { UploadService } from '@/module/upload/upload.service';

@Injectable()
export class IdentifyMultiUseCase {
  private readonly logger = new Logger(IdentifyMultiUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly core: AiCoreService,
    private readonly sessionsRepository: SessionsRepository,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(file: Express.Multer.File, operatorId: string) {
    this.logger.log(
      `Bắt đầu quy trình Identify Multi bởi operator: ${operatorId}`,
    );

    // 1. Lưu file audio (Tầng 3 validate: format, size, duration)
    const audioFile = await this.uploadService.uploadOne(
      file,
      AudioPurpose.IDENTIFY,
      operatorId,
    );

    const absolutePath = path.resolve(
      process.cwd(),
      this.config.rootDir,
      audioFile.file_path,
    );

    let aiResults: AiCoreMultiIdentifyResponse;
    let enrichedSpeakers: any[] = [];

    try {
      // 2. Gọi AI Service (Diarization + Identify)
      aiResults = await this.core.identifyMulti(
        absolutePath,
        audioFile.mime_type,
      );

      // Nhánh 422: Quá nhiều người nói
      if (aiResults?.error === 'too_many_speakers') {
        throw new UnprocessableEntityException({
          message: `Hội thoại phát hiện ${aiResults.num_speakers} người nói — hệ thống chỉ hỗ trợ tối đa 2 người`,
          num_speakers: aiResults.num_speakers,
        });
      }

      // 3. Làm giàu dữ liệu cho từng speaker
      if (aiResults && aiResults.speakers) {
        enrichedSpeakers = await Promise.all(
          aiResults.speakers.map(async (s) => {
            let userData: users | null = null;
            if (s.matched_voice_id) {
              userData = await this.prisma.users.findUnique({
                where: { id: s.matched_voice_id },
              });

              // Lazy import từ AI về BE
              if (!userData) {
                userData = await this.prisma.users.create({
                  data: {
                    id: s.matched_voice_id,
                    name: s.name || 'Unknown',
                    citizen_identification: s.citizen_identification || null,
                    phone_number: s.phone_number || null,
                    hometown: s.hometown || null,
                    job: s.job || null,
                    passport: s.passport || null,
                    criminal_record: (s.criminal_record as any) ?? undefined,
                    source: UserSource.AI_IMPORTED,
                  },
                });
              }
            }

            return {
              speaker_label: s.label || s.speaker_label,
              voice_id: s.matched_voice_id || null,
              score: s.score || null,
              name: userData?.name ?? 'Unknown',
              citizen_identification: userData?.citizen_identification ?? null,
              phone_number: userData?.phone_number ?? null,
              criminal_record: userData?.criminal_record ?? null,
              segments: s.segments || [],
            };
          }),
        );
      }
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        throw error;
      }
      this.logger.error(`Lỗi Nhận diện hội thoại: ${error.message}`);
      throw error;
    }

    // 4. Lưu session thông qua SessionsService
    const session = await this.sessionsRepository.create({
      user_id: operatorId,
      session_type: SessionType.MULTI,
      audio_file_id: audioFile.id,
      results: enrichedSpeakers,
    });

    // 5. Trả về kết quả
    return {
      session_id: session.id,
      session_type: session.session_type,
      audio_url: `${this.config.cdnUrl}/${audioFile.file_path}`,
      identified_at: session.identified_at,
      speakers: enrichedSpeakers,
    };
  }
}
