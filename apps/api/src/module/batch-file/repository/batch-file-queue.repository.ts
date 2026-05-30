import batchFileConfig from '@/config/batch-file.config';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Queue } from 'bullmq';
import {
  BATCH_FILE_CLEANUP_STORAGE_JOB,
  BATCH_FILE_PROCESS_JOB,
  BATCH_FILE_QUEUE,
  BATCH_FILE_RETRY_ITEM_JOB,
} from '../constants/batch-file.constants';
import { BatchFileTranslateDto } from '../dto/batch-file-translate.dto';

export interface BatchFileProcessJobPayload {
  batchId: string;
  dto: BatchFileTranslateDto;
  userId?: string;
}

export interface BatchFileRetryItemJobPayload {
  batchId: string;
  itemId: string;
  userId?: string;
}

export interface BatchFileCleanupStorageJobPayload {
  batchId: string;
}

@Injectable()
export class BatchFileQueueRepository {
  private readonly logger = new Logger(BatchFileQueueRepository.name);

  constructor(
    @InjectQueue(BATCH_FILE_QUEUE)
    private readonly batchFileQueue: Queue,
    @Inject(batchFileConfig.KEY)
    private readonly config: ConfigType<typeof batchFileConfig>,
  ) {}

  async enqueueProcess(payload: BatchFileProcessJobPayload) {
    await this.batchFileQueue.add(BATCH_FILE_PROCESS_JOB, payload, {
      jobId: `batch-file:${payload.batchId}:process`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    });
  }

  async enqueueRetryItem(payload: BatchFileRetryItemJobPayload) {
    await this.batchFileQueue.add(BATCH_FILE_RETRY_ITEM_JOB, payload, {
      jobId: `batch-file:${payload.batchId}:${payload.itemId}:retry:${Date.now()}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    });
  }

  async enqueueCleanupStorage(payload: BatchFileCleanupStorageJobPayload) {
    const existingJob = await this.batchFileQueue.getJob(
      this.getCleanupJobId(payload.batchId),
    );
    if (existingJob) {
      this.logger.debug(
        `Cleanup storage job already exists for batch ${payload.batchId} state=${await existingJob.getState()}`,
      );
      return;
    }

    await this.batchFileQueue.add(BATCH_FILE_CLEANUP_STORAGE_JOB, payload, {
      jobId: this.getCleanupJobId(payload.batchId),
      delay: this.config.storageCleanupDelayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    });

    this.logger.debug(
      `Enqueued cleanup storage for batch ${payload.batchId} with delay=${this.config.storageCleanupDelayMs}ms`,
    );
  }

  private getCleanupJobId(batchId: string) {
    return `batch-file:${batchId}:cleanup-storage`;
  }
}
