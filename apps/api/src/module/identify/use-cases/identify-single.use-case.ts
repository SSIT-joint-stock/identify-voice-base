import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { AudioPurpose, SessionType, UserSource } from '@prisma/client';
import * as path from 'path';

import storageConfig from '@/config/storage.config';
import { PrismaService } from '@/database/prisma/prisma.service';
import { AiCoreService } from '@/module/ai-core/ai-core.service';
import { AiCoreIdentifyResponse } from '@/module/ai-core/dto/ai-core-response.dto';
import { SessionsRepository } from '@/module/sessions/sessions.repository';
import { UploadService } from '@/module/upload/upload.service';

@Injectable()
export class IdentifySingleUseCase {
  private readonly logger = new Logger(IdentifySingleUseCase.name);

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
      `Bắt đầu quy trình Identify Single bởi operator: ${operatorId}`,
    );

    // 1. Lưu file audio (Tầng 1 & 2 đã được Multer/Pipes xử lý sơ bộ)
    // UploadService sẽ thực hiện validate MimeType, Size và Duration (Tầng 3)
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

    let enriched: any[] = [];
    let aiResults: AiCoreIdentifyResponse[] = [];

    try {
      // 2. Gọi AI Service để nhận dạng
      aiResults = await this.core.identifySingle(
        absolutePath,
        audioFile.mime_type,
      );
      console.log(aiResults);

      // 3. Làm giàu dữ liệu từ PostgreSQL
      if (aiResults && aiResults.length > 0) {
        // Lọc bỏ các kết quả không hợp lệ (ví dụ: { message: 'No matching voice found' })
        const validResults = aiResults.filter((r) => !!r.matched_voice_id);

        enriched = await Promise.all(
          validResults.map(async (r, i) => {
            let user = await this.prisma.users.findUnique({
              where: {
                id: r.matched_voice_id,
              },
            });
            // Lazy import từ AI về BE
            if (!user) {
              user = await this.prisma.users.create({
                data: {
                  id: r.matched_voice_id,
                  name: r.name || 'Unknown',
                  citizen_identification: r.citizen_identification || null,
                  phone_number: r.phone_number || null,
                  hometown: r.hometown || null,
                  job: r.job || null,
                  passport: r.passport || null,
                  criminal_record: (r.criminal_record as any) ?? undefined,
                  source: UserSource.AI_IMPORTED,
                },
              });
            }

            return {
              rank: i + 1,
              voice_id: r.matched_voice_id,
              score: r.score,
              name: user?.name ?? 'Unknown',
              citizen_identification: user?.citizen_identification ?? null,
              phone_number: user?.phone_number ?? null,
              criminal_record: (user?.criminal_record as any) ?? null,
            };
          }),
        );
      }
    } catch (error) {
      this.logger.error(`Lỗi trong quá trình nhận dạng: ${error.message}`);
      // Vẫn tiếp tục lưu session trống nếu upload thành công nhưng AI lỗi (để audit thao tác)
      // Nhưng theo SLA và doc, nếu AI lỗi/timeout (503) thì throw để Client biết.
      // Ở đây ta throw để middleware handle.
      throw error;
    }

    // 4. Lưu session thông qua SessionsService
    const session = await this.sessionsRepository.create({
      user_id: operatorId,
      session_type: SessionType.SINGLE,
      audio_file_id: audioFile.id,
      results: enriched,
    });

    // 5. Trả về kết quả theo cấu trúc API doc
    return {
      session_id: session.id,
      session_type: session.session_type,
      audio_url: `${this.config.cdnUrl}/${audioFile.file_path}`,
      identified_at: session.identified_at,
      results: enriched,
    };
  }
}
