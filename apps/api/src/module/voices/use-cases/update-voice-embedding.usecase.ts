import { PrismaService } from '@/database/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import type { Queue } from 'bull';

@Injectable()
export class UpdateVoiceEmbeddingUseCase {
  private readonly logger = new Logger(UpdateVoiceEmbeddingUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('update-voice')
    private readonly updateVoiceQueue: Queue,
  ) {}

  async execute(voiceId: string, audioIds: string[], adminId: string) {
    // Check if voice record exists
    const activeVoice = await this.prisma.voice_records.findUnique({
      where: { voice_id: voiceId },
      include: { user: true },
    });

    if (!activeVoice) {
      throw new NotFoundException(
        'Người dùng không có voice record đang active. Không thể update.',
      );
    }

    // Check if audios exist
    const countAudios = await this.prisma.audio_files.count({
      where: { id: { in: audioIds } },
    });
    if (countAudios !== audioIds.length) {
      throw new NotFoundException(
        'Một hoặc nhiều Audio ID không tồn tại trong hệ thống.',
      );
    }

    // Create tracking job in DB
    const job = await this.prisma.update_voice_jobs.create({
      data: {
        user_id: activeVoice.user_id,
        voice_id: voiceId,
        audio_file_ids: audioIds,
        status: JobStatus.PENDING,
        progress: 0,
      },
    });

    // Spawn BG Job
    await this.updateVoiceQueue.add('update-voice-job', {
      jobId: job.id,
      voiceId,
      audioIds,
      adminId,
    });

    this.logger.debug(
      `Initiated update voice job ${job.id} for voice_id ${voiceId}`,
    );

    return {
      job_id: job.id,
      status: JobStatus.PENDING,
      created_at: job.created_at,
    };
  }
}
