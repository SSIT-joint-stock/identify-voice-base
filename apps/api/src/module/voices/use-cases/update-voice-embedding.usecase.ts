import { PrismaService } from '@/database/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import type { Queue } from 'bullmq';

@Injectable()
export class UpdateVoiceEmbeddingUseCase {
  private readonly logger = new Logger(UpdateVoiceEmbeddingUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('update-voice')
    private readonly updateVoiceQueue: Queue,
  ) {}

  async execute(userId: string, audioIds: string[], adminId: string) {
    const activeVoice = await this.prisma.voice_records.findFirst({
      where: {
        user_id: userId,
        is_active: true,
      },
      include: { user: true },
      orderBy: { created_at: 'desc' },
    });

    if (!activeVoice) {
      throw new NotFoundException(
        'Người dùng không có voice record đang active. Không thể update.',
      );
    }

    const inFlightJob = await this.prisma.update_voice_jobs.findFirst({
      where: {
        user_id: userId,
        voice_id: activeVoice.voice_id,
        status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] },
      },
      orderBy: { created_at: 'desc' },
    });

    if (inFlightJob) {
      throw new ConflictException(
        'Đang có một job cập nhật khác chạy cho hồ sơ này.',
      );
    }

    const matchedSessions = await this.prisma.identify_sessions.findMany({
      where: {
        audio_file_id: { in: audioIds },
        results: {
          array_contains: [{ matched_voice_id: activeVoice.voice_id }],
        },
      },
      select: { audio_file_id: true },
    });

    const validAudioIds = new Set(
      matchedSessions.map((item) => item.audio_file_id),
    );

    if (validAudioIds.size !== audioIds.length) {
      throw new NotFoundException(
        'Một hoặc nhiều audio không thuộc lịch sử nhận dạng của hồ sơ này.',
      );
    }

    const job = await this.prisma.update_voice_jobs.create({
      data: {
        user_id: activeVoice.user_id,
        voice_id: activeVoice.voice_id,
        audio_file_ids: audioIds,
        status: JobStatus.PENDING,
        progress: 0,
      },
    });

    // Spawn BG Job
    await this.updateVoiceQueue.add(
      'update-voice-job',
      {
        jobId: job.id,
        userId,
        voiceId: activeVoice.voice_id,
        activeVoiceRecordId: activeVoice.id,
        audioIds,
        adminId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      },
    );

    this.logger.debug(
      `Initiated update voice job ${job.id} for user ${userId} / voice_id ${activeVoice.voice_id}`,
    );

    return {
      job_id: job.id,
      status: JobStatus.PENDING,
      created_at: job.created_at,
    };
  }
}
