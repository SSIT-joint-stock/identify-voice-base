import { RedisService } from '@/database/redis/redis.service';
import batchFileConfig from '@/config/batch-file.config';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { BatchFileItemState, BatchFileState } from '../types/batch-file.types';

@Injectable()
export class BatchFileRepository {
  private readonly batchWriteLocks = new Map<string, Promise<void>>();

  constructor(
    private readonly redisService: RedisService,
    @Inject(batchFileConfig.KEY)
    private readonly config: ConfigType<typeof batchFileConfig>,
  ) {}

  async findById(batchId: string) {
    const rawBatch = await this.redisService.get(this.getBatchKey(batchId));

    if (!rawBatch) {
      throw new NotFoundException(
        'Batch dịch file không tồn tại hoặc đã hết hạn.',
      );
    }

    return JSON.parse(rawBatch) as BatchFileState;
  }

  async save(batch: BatchFileState) {
    await this.redisService.set(
      this.getBatchKey(batch.batch_id),
      JSON.stringify(batch),
      this.config.ttlSeconds,
    );
  }

  async patchBatch(
    batchId: string,
    patch: Partial<Omit<BatchFileState, 'batch_id' | 'created_at'>>,
  ) {
    await this.withBatchWriteLock(batchId, async () => {
      const batch = await this.findById(batchId);
      await this.save({
        ...batch,
        ...patch,
        updated_at: new Date().toISOString(),
      });
    });
  }

  async patchItem(
    batchId: string,
    itemId: string,
    patch: Partial<Omit<BatchFileItemState, 'item_id' | 'created_at'>>,
  ) {
    await this.withBatchWriteLock(batchId, async () => {
      const batch = await this.findById(batchId);
      const items = batch.items.map((item) =>
        item.item_id === itemId
          ? {
              ...item,
              ...patch,
              updated_at: new Date().toISOString(),
            }
          : item,
      );

      await this.save({
        ...batch,
        items,
        updated_at: new Date().toISOString(),
      });
    });
  }

  private async withBatchWriteLock<T>(
    batchId: string,
    task: () => Promise<T>,
  ): Promise<T> {
    const previous = this.batchWriteLocks.get(batchId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });

    this.batchWriteLocks.set(
      batchId,
      previous.catch(() => undefined).then(() => next),
    );

    await previous.catch(() => undefined);

    try {
      return await task();
    } finally {
      release();
    }
  }

  private getBatchKey(batchId: string) {
    return `batch-file:translation-batch:${batchId}`;
  }
}
