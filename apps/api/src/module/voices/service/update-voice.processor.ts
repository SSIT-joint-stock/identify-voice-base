import storageConfig from '@/config/storage.config';
import { PrismaService } from '@/database/prisma/prisma.service';
import { AiCoreService } from '@/module/ai-core/service/ai-core.service';
import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JobStatus } from '@prisma/client';
import type { Job } from 'bull';
import * as path from 'path';

export interface UpdateVoiceJobData {
  jobId: string;
  voiceId: string;
  audioIds: string[];
  adminId: string;
}

/**
 * Bull Processor xử lý background job Update Voice (UC04)
 *
 * Luồng:
 * 1. Lấy voice record từ DB theo voiceId
 * 2. Với mỗi audioId: lấy file_path từ DB → resolve absolute path → gọi AI uploadVoice()
 * 3. Ghi log vào bảng voice_update_logs
 *
 * Không cần versioning hay is_active vì AI chỉ có 1 voiceId duy nhất và append thêm sample.
 */
@Processor('update-voice')
export class UpdateVoiceProcessor {
  private readonly logger = new Logger(UpdateVoiceProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiCoreService,
    @Inject(storageConfig.KEY)
    private readonly storageCfg: ConfigType<typeof storageConfig>,
  ) {}

  @Process('update-voice-job')
  async handleUpdateVoice(job: Job<UpdateVoiceJobData>) {
    const { jobId, voiceId, audioIds, adminId } = job.data;

    try {
      this.logger.debug(`[Job ${jobId}] Bắt đầu xử lý cho voice_id ${voiceId}`);

      // --- Progress 0%: Validate voice record ---
      await this.updateProgress(jobId, JobStatus.PROCESSING, 0);

      const voiceRecord = await this.prisma.voice_records.findUnique({
        where: { voice_id: voiceId },
      });

      if (!voiceRecord) {
        throw new Error(`Voice ${voiceId} không tồn tại trong hệ thống.`);
      }

      // --- Progress 10%–80%: Loop gọi AI cho từng audio ---
      const step = Math.floor(70 / audioIds.length);
      let currentProgress = 10;
      await this.updateProgress(jobId, JobStatus.PROCESSING, currentProgress);

      const successfulAudios: string[] = [];

      for (const [index, audioId] of audioIds.entries()) {
        this.logger.debug(
          `[Job ${jobId}] Audio ${index + 1}/${audioIds.length}: ${audioId}`,
        );

        const audioDb = await this.prisma.audio_files.findUnique({
          where: { id: audioId },
        });

        if (!audioDb) {
          this.logger.warn(`Audio ${audioId} không tồn tại trong DB, bỏ qua.`);
          continue;
        }

        // Resolve absolute path từ storage key
        const absolutePath = path.resolve(
          process.cwd(),
          this.storageCfg.rootDir,
          audioDb.file_path,
        );

        try {
          // Gọi AI uploadVoice: endpoint /upload_voice?name=<voiceId>
          // "name" ở đây dùng voiceId vì AI dùng name để match Qdrant point
          await this.aiService.uploadVoice(
            absolutePath,
            voiceId, // name = voiceId → AI sẽ append vào đúng Qdrant point
            audioDb.mime_type,
          );

          successfulAudios.push(audioId);
          this.logger.debug(`[Job ${jobId}] Audio ${audioId} ✓ đã đẩy lên AI`);
        } catch (audioErr: any) {
          this.logger.error(
            `[Job ${jobId}] Lỗi khi đẩy audio ${audioId} lên AI: ${audioErr.message}`,
          );
          // Tiếp tục với file tiếp theo, không throw
        }

        currentProgress += step;
        await this.updateProgress(
          jobId,
          JobStatus.PROCESSING,
          Math.min(80, currentProgress),
        );
      }

      if (successfulAudios.length === 0) {
        throw new Error('Không có audio nào được đẩy thành công lên AI.');
      }

      // --- Progress 90%: Lưu voice_update_logs ---
      await this.updateProgress(jobId, JobStatus.PROCESSING, 90);

      await this.prisma.voice_update_logs.createMany({
        data: successfulAudios.map((aId) => ({
          voice_id: voiceId,
          audio_file_id: aId,
          updated_by: adminId,
        })),
      });

      // --- Progress 100%: Done ---
      await this.updateProgress(jobId, JobStatus.DONE, 100);
      this.logger.log(
        `[Job ${jobId}] ✅ Hoàn tất — ${successfulAudios.length}/${audioIds.length} audio đẩy thành công cho voice_id ${voiceId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[Job ${jobId}] ❌ Xử lý thất bại: ${error.message}`,
        error.stack,
      );

      await this.prisma.update_voice_jobs
        .update({
          where: { id: jobId },
          data: {
            status: JobStatus.FAILED,
            error_msg: error.message ?? 'Unknown error',
            updated_at: new Date(),
          },
        })
        .catch(() => {});

      throw error; // Re-throw để Bull retry mechanism hoạt động
    }
  }

  private async updateProgress(
    jobId: string,
    status: JobStatus,
    progress: number,
  ) {
    await this.prisma.update_voice_jobs.update({
      where: { id: jobId },
      data: { status, progress, updated_at: new Date() },
    });
  }
}
