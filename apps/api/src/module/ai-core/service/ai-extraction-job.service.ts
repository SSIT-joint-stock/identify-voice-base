import { RedisService } from '@/database/redis/redis.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OcrRequestDto } from '../dto/ocr-request.dto';
import { SpeechToTextRequestDto } from '../dto/speech-to-text-request.dto';
import { AiOcrUseCase } from '../usecase/ai-ocr.usecase';
import { AiSpeechToTextUseCase } from '../usecase/ai-speech-to-text.usecase';

type ExtractionJobMode = 'ocr' | 'speech-to-text';
type ExtractionJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
type ExtractionJobDto = OcrRequestDto | SpeechToTextRequestDto;

export interface ExtractionJobState {
  job_id: string;
  status: ExtractionJobStatus;
  progress: number;
  mode: ExtractionJobMode;
  result?: unknown;
  error?: string;
  created_at: string;
  updated_at: string;
}

const EXTRACTION_JOB_TTL_SECONDS = 60 * 30;

@Injectable()
export class AiExtractionJobService {
  private readonly logger = new Logger(AiExtractionJobService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly ocrUseCase: AiOcrUseCase,
    private readonly speechToTextUseCase: AiSpeechToTextUseCase,
  ) {}

  async createOcrJob(file: Express.Multer.File, dto: OcrRequestDto) {
    return this.createJob('ocr', file, dto);
  }

  async createSpeechToTextJob(
    file: Express.Multer.File,
    dto: SpeechToTextRequestDto,
  ) {
    return this.createJob('speech-to-text', file, dto);
  }

  async getJob(jobId: string) {
    const rawJob = await this.redisService.get(this.getJobKey(jobId));

    if (!rawJob) {
      throw new NotFoundException(
        'Extraction job không tồn tại hoặc đã hết hạn.',
      );
    }

    return JSON.parse(rawJob) as ExtractionJobState;
  }

  private async createJob(
    mode: ExtractionJobMode,
    file: Express.Multer.File,
    dto: ExtractionJobDto,
  ) {
    const jobId = randomUUID();
    const now = new Date().toISOString();

    await this.saveJob({
      job_id: jobId,
      status: 'pending',
      progress: 0,
      mode,
      created_at: now,
      updated_at: now,
    });

    void this.runJob(jobId, mode, file, dto);

    return { job_id: jobId };
  }

  private async runJob(
    jobId: string,
    mode: ExtractionJobMode,
    file: Express.Multer.File,
    dto: ExtractionJobDto,
  ) {
    let progressTimer: NodeJS.Timeout | undefined;

    try {
      await this.patchJob(jobId, {
        status: 'processing',
        progress: 5,
      });

      progressTimer = this.startProgressTimer(jobId);

      const result =
        mode === 'ocr'
          ? await this.ocrUseCase.execute(file, dto as OcrRequestDto)
          : await this.speechToTextUseCase.execute(
              file,
              dto as SpeechToTextRequestDto,
            );

      await this.patchJob(jobId, {
        status: 'completed',
        progress: 100,
        result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(`Extraction job ${jobId} failed: ${message}`);

      await this.patchJob(jobId, {
        status: 'failed',
        error: message,
      }).catch(() => {});
    } finally {
      if (progressTimer) {
        clearInterval(progressTimer);
      }
    }
  }

  private startProgressTimer(jobId: string) {
    return setInterval(() => {
      void this.bumpProcessingProgress(jobId).catch((error) => {
        this.logger.warn(
          `Cannot update extraction job ${jobId} progress: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }, 2000);
  }

  private async bumpProcessingProgress(jobId: string) {
    const currentJob = await this.getJob(jobId);

    if (currentJob.status !== 'processing') {
      return;
    }

    const nextProgress =
      currentJob.progress < 70
        ? currentJob.progress + 5
        : currentJob.progress < 90
          ? currentJob.progress + 2
          : currentJob.progress + 1;

    await this.patchJob(jobId, {
      status: 'processing',
      progress: Math.min(nextProgress, 95),
    });
  }

  private async patchJob(
    jobId: string,
    patch: Partial<Omit<ExtractionJobState, 'job_id' | 'created_at' | 'mode'>>,
  ) {
    const currentJob = await this.getJob(jobId);

    await this.saveJob({
      ...currentJob,
      ...patch,
      updated_at: new Date().toISOString(),
    });
  }

  private async saveJob(job: ExtractionJobState) {
    await this.redisService.set(
      this.getJobKey(job.job_id),
      JSON.stringify(job),
      EXTRACTION_JOB_TTL_SECONDS,
    );
  }

  private getJobKey(jobId: string) {
    return `ai-core:extraction-job:${jobId}`;
  }
}
