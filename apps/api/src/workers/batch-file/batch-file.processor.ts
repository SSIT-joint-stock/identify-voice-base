import batchFileConfig, {
  getBatchFileConfig,
} from '@/config/batch-file.config';
import {
  BATCH_FILE_CLEANUP_STORAGE_JOB,
  BATCH_FILE_PROCESS_JOB,
  BATCH_FILE_QUEUE,
  BATCH_FILE_RETRY_ITEM_JOB,
} from '@/module/batch-file/constants';

import { BatchFileTranslateDto } from '@/module/batch-file/dto/batch-file-translate.dto';
import {
  BatchFileCleanupStorageJobPayload,
  BatchFileProcessJobPayload,
  BatchFileRetryItemJobPayload,
} from '@/module/batch-file/repository/batch-file-queue.repository';
import { BatchFileStorageRepository } from '@/module/batch-file/repository/batch-file-storage.repository';
import { BatchFileRepository } from '@/module/batch-file/repository/batch-file.repository';
import { Semaphore } from '@/module/batch-file/use-cases/batch-file.helpers';
import { CleanupBatchFileStorageUseCase } from '@/module/batch-file/use-cases/cleanup-batch-file-storage.usecase';
import { ProcessBatchFileItemUseCase } from '@/module/batch-file/use-cases/process-batch-file-item.usecase';
import { ProcessBatchFileUseCase } from '@/module/batch-file/use-cases/process-batch-file.usecase';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Job } from 'bullmq';

@Processor(BATCH_FILE_QUEUE, {
  concurrency: getBatchFileConfig().workerConcurrency,
})
export class BatchFileProcessor extends WorkerHost {
  private readonly logger = new Logger(BatchFileProcessor.name);

  constructor(
    private readonly batchFileRepository: BatchFileRepository,
    private readonly batchFileStorageRepository: BatchFileStorageRepository,
    private readonly cleanupBatchFileStorageUseCase: CleanupBatchFileStorageUseCase,
    private readonly processBatchFileUseCase: ProcessBatchFileUseCase,
    private readonly processBatchFileItemUseCase: ProcessBatchFileItemUseCase,
    @Inject(batchFileConfig.KEY)
    private readonly config: ConfigType<typeof batchFileConfig>,
  ) {
    super();
  }

  async process(
    job: Job<
      | BatchFileCleanupStorageJobPayload
      | BatchFileProcessJobPayload
      | BatchFileRetryItemJobPayload
    >,
  ) {
    if (job.name === BATCH_FILE_CLEANUP_STORAGE_JOB) {
      await this.cleanupStorage(job as Job<BatchFileCleanupStorageJobPayload>);
      return;
    }

    if (job.name === BATCH_FILE_PROCESS_JOB) {
      await this.processBatch(job as Job<BatchFileProcessJobPayload>);
      return;
    }

    if (job.name === BATCH_FILE_RETRY_ITEM_JOB) {
      await this.retryItem(job as Job<BatchFileRetryItemJobPayload>);
      return;
    }

    this.logger.warn(`Unknown batch-file job: ${job.name}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Batch-file job completed: ${job.name}/${job.id}`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Batch-file job active: ${job.name}/${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `Batch-file job failed: ${job?.name ?? 'unknown'}/${job?.id ?? 'unknown'} - ${error.message}`,
    );
  }

  private async processBatch(job: Job<BatchFileProcessJobPayload>) {
    await this.processBatchFileUseCase.execute(job.data);
  }

  private async cleanupStorage(job: Job<BatchFileCleanupStorageJobPayload>) {
    await this.cleanupBatchFileStorageUseCase.execute(job.data.batchId);
  }

  private async retryItem(job: Job<BatchFileRetryItemJobPayload>) {
    const { batchId, itemId, userId } = job.data;
    const batch = await this.batchFileRepository.findById(batchId);
    const item = batch.items.find((entry) => entry.item_id === itemId);

    if (!item) {
      throw new Error('Item dịch file không tồn tại.');
    }

    const file = await this.batchFileStorageRepository.getUploadedFile(item);
    if (!file) {
      throw new Error('Không còn file gốc để chạy lại item.');
    }

    const dto: BatchFileTranslateDto = {
      source_lang: item.source_lang as BatchFileTranslateDto['source_lang'],
      target_lang: item.target_lang as BatchFileTranslateDto['target_lang'],
      return_timestamp: item.return_timestamp,
      denoise_audio: item.denoise_audio,
    };

    await this.processBatchFileItemUseCase.execute({
      batchId,
      itemId,
      file,
      dto,
      userId,
      extractionSemaphore: new Semaphore(this.config.extractionConcurrency),
      translateSemaphore: new Semaphore(this.config.translateConcurrency),
    });
  }
}
