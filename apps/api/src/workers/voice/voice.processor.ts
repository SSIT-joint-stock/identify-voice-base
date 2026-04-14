import storageConfig from '@/config/storage.config';
import { PrismaService } from '@/database/prisma/prisma.service';
import { AiCoreService } from '@/module/ai-core/service/ai-core.service';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JobStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import * as path from 'path';

export interface UpdateVoiceJobData {
  jobId: string;
  userId: string;
  voiceId: string;
  activeVoiceRecordId: string;
  audioIds: string[];
  adminId: string;
}

@Processor('update-voice')
export class VoiceProcessor extends WorkerHost {
  private readonly logger = new Logger(VoiceProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiCoreService,
    @Inject(storageConfig.KEY)
    private readonly storageCfg: ConfigType<typeof storageConfig>,
  ) {
    super();
  }

  async process(job: Job<UpdateVoiceJobData>) {
    if (job.name !== 'update-voice-job') {
      this.logger.warn(`Bỏ qua job không hỗ trợ: ${job.name}`);
      return;
    }

    const { jobId, userId, voiceId, activeVoiceRecordId, audioIds, adminId } =
      job.data;

    try {
      this.logger.debug(`[Job ${jobId}] Bắt đầu xử lý cho voice_id ${voiceId}`);
      await this.updateProgress(jobId, JobStatus.PROCESSING, 0);

      const voiceRecord = await this.prisma.voice_records.findFirst({
        where: {
          id: activeVoiceRecordId,
          user_id: userId,
          voice_id: voiceId,
          is_active: true,
        },
        include: {
          user: true,
        },
      });

      if (!voiceRecord) {
        throw new Error(
          `Không tìm thấy active voice record cho user ${userId} / voice_id ${voiceId}.`,
        );
      }

      const step = Math.max(1, Math.floor(70 / Math.max(1, audioIds.length)));
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

        const absolutePath = path.resolve(
          process.cwd(),
          this.storageCfg.rootDir,
          audioDb.file_path,
        );

        try {
          await this.aiService.uploadVoice(
            absolutePath,
            voiceId,
            audioDb.mime_type,
          );

          successfulAudios.push(audioId);
          this.logger.debug(`[Job ${jobId}] Audio ${audioId} ✓ đã đẩy lên AI`);
        } catch (audioErr: any) {
          this.logger.error(
            `[Job ${jobId}] Lỗi khi đẩy audio ${audioId} lên AI: ${audioErr.message}`,
          );
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

      const latestAudioId = successfulAudios[successfulAudios.length - 1];
      await this.updateProgress(jobId, JobStatus.PROCESSING, 90);

      await this.prisma.$transaction(async (tx) => {
        await tx.voice_records.update({
          where: { id: voiceRecord.id },
          data: { is_active: false },
        });

        const nextVoiceRecord = await tx.voice_records.create({
          data: {
            user_id: voiceRecord.user_id,
            user_name: voiceRecord.user_name ?? voiceRecord.user?.name ?? null,
            user_email: voiceRecord.user_email,
            voice_id: voiceRecord.voice_id,
            audio_file_id: latestAudioId,
            is_active: true,
          },
        });

        const latestAudio = await tx.audio_files.findUnique({
          where: { id: latestAudioId },
        });

        if (!latestAudio) {
          throw new Error(
            `Audio đại diện ${latestAudioId} không tồn tại sau khi cập nhật.`,
          );
        }

        await tx.users.update({
          where: { id: voiceRecord.user_id },
          data: {
            audio_url: `${this.storageCfg.cdnUrl}/${latestAudio.file_path}`,
          },
        });

        await tx.voice_update_logs.createMany({
          data: successfulAudios.map((aId) => ({
            voice_record_id: nextVoiceRecord.id,
            voice_id: voiceId,
            audio_file_id: aId,
            updated_by: adminId,
          })),
        });
      });

      await this.updateProgress(jobId, JobStatus.DONE, 100);
      this.logger.log(
        `[Job ${jobId}] Hoàn tất ${successfulAudios.length}/${audioIds.length} audio cho voice_id ${voiceId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[Job ${jobId}] Xử lý thất bại: ${error.message}`,
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

      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<UpdateVoiceJobData>, error: Error) {
    this.logger.error(
      `[Job ${job?.data?.jobId ?? 'unknown'}] Worker failed: ${error.message}`,
    );
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
