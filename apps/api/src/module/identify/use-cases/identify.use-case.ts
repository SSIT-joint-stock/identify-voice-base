import {
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { AudioPurpose } from '@prisma/client';
import * as path from 'path';

import storageConfig from '@/config/storage.config';
import { PrismaService } from '@/database/prisma/prisma.service';
import { AiCoreService } from '@/module/ai-core/service/ai-core.service';
import { NormalizedIdentifyResponse } from '@/module/ai-core/usecase/ai-identify-single.usecase';
import { SessionsRepository } from '@/module/sessions/repository/sessions.repository';
import { UploadService } from '@/module/upload/service/upload.service';

@Injectable()
export class IdentifyUseCase {
  private readonly logger = new Logger(IdentifyUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly aiCoreService: AiCoreService,
    private readonly sessionsRepository: SessionsRepository,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(
    file: Express.Multer.File,
    operatorId: string,
    type: 'SINGLE' | 'MULTI',
  ) {
    this.logger.log(
      `Bắt đầu quy trình Identify bởi operator: ${operatorId} (${type})`,
    );

    // 1. Lưu file audio
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

    let aiResponse: NormalizedIdentifyResponse = { speakers: [] };

    try {
      // 2. Gọi AI
      if (type === 'SINGLE') {
        aiResponse = await this.aiCoreService.identifySingle(
          absolutePath,
          audioFile.mime_type,
        );
      } else {
        aiResponse = await this.aiCoreService.identifyMulti(
          absolutePath,
          audioFile.mime_type,
        );
      }

      // 3. Upsert vào ai_identities_cache metadata từ AI thay vì dính líu đến users
      if (aiResponse.speakers.length > 0) {
        // Caching chỉ lưu khi AI có trả về voice_id
        const validSpeakers = aiResponse.speakers.filter(
          (s) => !!s.matched_voice_id,
        );

        await Promise.all(
          validSpeakers.map((s) => {
            return this.prisma.ai_identities_cache.upsert({
              where: { voice_id: s.matched_voice_id! },
              create: {
                voice_id: s.matched_voice_id!,
                name: s.name,
                citizen_identification: s.citizen_identification,
                phone_number: s.phone_number,
                hometown: s.hometown,
                job: s.job,
                passport: s.passport,
                criminal_record: s.criminal_record ?? undefined,
                raw: s.raw_ai_data ?? {},
              },
              update: {
                name: s.name,
                citizen_identification: s.citizen_identification,
                phone_number: s.phone_number,
                hometown: s.hometown,
                job: s.job,
                passport: s.passport,
                criminal_record: s.criminal_record ?? undefined,
                raw: s.raw_ai_data ?? {},
              },
            });
          }),
        );
      }
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        throw error;
      }
      this.logger.error(`Lỗi Nhận diện âm thanh: ${error.message}`);
      throw error;
    }

    // 4. Lưu session thông qua SessionsRepository (chỉ lưu kết quả RAW đã chuẩn hoá từ AI)
    const session = await this.sessionsRepository.create({
      user_id: operatorId,
      audio_file_id: audioFile.id,
      // Lưu thẳng array speakers vào JSON results
      results: aiResponse.speakers as any,
    });

    // 5. Trả về kết quả — metadata Business Truth từ users khi đã định danh & còn active
    const enrichedSpeakers = await Promise.all(
      aiResponse.speakers.map(async (s) => {
        const base = {
          speaker_label: s.speaker_label,
          matched_voice_id: s.matched_voice_id,
          score: s.score,
          name: s.name,
          citizen_identification: s.citizen_identification,
          phone_number: s.phone_number,
          segments: s.segments,
        };

        let row: Record<string, unknown> = { ...base };

        if (s.matched_voice_id) {
          const voiceRecord = await this.prisma.voice_records.findFirst({
            where: {
              voice_id: s.matched_voice_id,
              is_active: true,
            },
            include: { user: true },
            orderBy: { created_at: 'desc' },
          });
          if (voiceRecord?.is_active && voiceRecord.user) {
            const u = voiceRecord.user;
            row = {
              ...row,
              user_id: u.id,
              name: u.name,
              citizen_identification: u.citizen_identification,
              phone_number: u.phone_number,
              hometown: u.hometown,
              job: u.job,
              passport: u.passport,
              age: u.age,
              gender: u.gender,
              criminal_record: u.criminal_record,
              enroll_audio_url: u.audio_url ?? undefined,
            };
          }
        }

        if (type === 'MULTI' && s.segments && s.segments.length > 0) {
          row.audio_url = `${this.config.cdnUrl.replace('/cdn', '/api/v1')}/sessions/${session.id}/speakers/${s.speaker_label}/audio`;
        }

        return row;
      }),
    );

    return {
      session_id: session.id,
      audio_url: `${this.config.cdnUrl}/${audioFile.file_path}`,
      identified_at: session.identified_at,
      type,
      speakers: enrichedSpeakers,
    };
  }
}
