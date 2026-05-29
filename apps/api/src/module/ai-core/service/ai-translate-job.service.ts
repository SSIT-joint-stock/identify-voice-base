import { RedisService } from '@/database/redis/redis.service';
import { TranslationHistoryService } from '@/module/translation-history/service/translation-history.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TranslateRequestDto } from '../dto/translate-request.dto';
import { AiTranslateUseCase } from '../usecase/ai-translate.usecase';

type TranslateJobMode = 'translate' | 'summarize';
type TranslateJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TranslateJobState {
  job_id: string;
  status: TranslateJobStatus;
  progress: number;
  mode: TranslateJobMode;
  result?: unknown;
  error?: string;
  created_at: string;
  updated_at: string;
}

const TRANSLATE_JOB_TTL_SECONDS = 60 * 30;

@Injectable()
export class AiTranslateJobService {
  private readonly logger = new Logger(AiTranslateJobService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly translateUseCase: AiTranslateUseCase,
    private readonly translationHistoryService: TranslationHistoryService,
  ) {}

  async createJob(
    mode: TranslateJobMode,
    dto: TranslateRequestDto,
    userId?: string,
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

    void this.runJob(jobId, mode, dto, userId);

    return { job_id: jobId };
  }

  async getJob(jobId: string) {
    const rawJob = await this.redisService.get(this.getJobKey(jobId));

    if (!rawJob) {
      throw new NotFoundException(
        'Translate job không tồn tại hoặc đã hết hạn.',
      );
    }

    return JSON.parse(rawJob) as TranslateJobState;
  }

  private async runJob(
    jobId: string,
    mode: TranslateJobMode,
    dto: TranslateRequestDto,
    userId?: string,
  ) {
    try {
      await this.patchJob(jobId, {
        status: 'processing',
        progress: 1,
      });

      let progressUpdate = Promise.resolve();
      const updateProgress = (
        progress: number,
        translatedText?: string,
        processedChunks?: number,
        totalChunks?: number,
      ) => {
        progressUpdate = progressUpdate.then(() =>
          this.patchJob(jobId, {
            status: 'processing',
            progress: Math.min(progress, 99),
            ...(translatedText
              ? {
                  result: {
                    original_text: dto.source_text,
                    translated_text: translatedText,
                    target_lang: dto.target_lang ?? 'en',
                    processed_chunks: processedChunks,
                    total_chunks: totalChunks,
                  },
                }
              : {}),
          }),
        );
      };

      const result =
        mode === 'summarize'
          ? await this.translateUseCase.translateSummarizeWithProgress(
              dto,
              updateProgress,
            )
          : await this.translateUseCase.executeWithProgress(
              dto,
              updateProgress,
            );

      await progressUpdate;
      const historyRecord = await this.recordTranslation(
        dto,
        result,
        mode,
        userId,
      );
      const resultWithHistory = this.attachHistoryRecordId(
        result,
        historyRecord,
      );

      await this.patchJob(jobId, {
        status: 'completed',
        progress: 100,
        result: resultWithHistory,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(`Translate job ${jobId} failed: ${message}`);

      await this.patchJob(jobId, {
        status: 'failed',
        error: message,
      });
    }
  }

  private async patchJob(
    jobId: string,
    patch: Partial<Omit<TranslateJobState, 'job_id' | 'created_at' | 'mode'>>,
  ) {
    const currentJob = await this.getJob(jobId);

    await this.saveJob({
      ...currentJob,
      ...patch,
      updated_at: new Date().toISOString(),
    });
  }

  private async saveJob(job: TranslateJobState) {
    await this.redisService.set(
      this.getJobKey(job.job_id),
      JSON.stringify(job),
      TRANSLATE_JOB_TTL_SECONDS,
    );
  }

  private getJobKey(jobId: string) {
    return `ai-core:translate-job:${jobId}`;
  }

  private async recordTranslation(
    dto: TranslateRequestDto,
    result: unknown,
    mode: TranslateJobMode,
    userId?: string,
  ) {
    if (!userId || !result || typeof result !== 'object') {
      return null;
    }

    const translatedText = (result as Record<string, unknown>).translated_text;

    if (typeof translatedText !== 'string') {
      return null;
    }

    return this.translationHistoryService.recordTranslation({
      userId,
      sourceText: dto.source_text,
      translatedText,
      sourceLang: dto.source_lang,
      targetLang: dto.target_lang,
      sourceFileType: dto.source_file_type,
      mode,
    });
  }

  private attachHistoryRecordId(result: unknown, historyRecord: unknown) {
    if (!result || typeof result !== 'object') {
      return result;
    }

    if (!historyRecord || typeof historyRecord !== 'object') {
      return result;
    }

    const historyId = (historyRecord as Record<string, unknown>).id;

    if (typeof historyId !== 'string') {
      return result;
    }

    return {
      ...(result as Record<string, unknown>),
      history_record_id: historyId,
    };
  }
}
