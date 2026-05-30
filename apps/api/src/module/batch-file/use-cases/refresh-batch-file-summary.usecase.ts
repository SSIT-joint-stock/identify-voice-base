import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import { BatchFileQueueRepository } from '../repository/batch-file-queue.repository';
import { BatchFileRepository } from '../repository/batch-file.repository';
import { BatchFileStatus } from '../types/batch-file.types';

@Injectable()
export class RefreshBatchFileSummaryUseCase implements BaseUseCase<
  string,
  Promise<void>
> {
  constructor(
    private readonly batchFileRepository: BatchFileRepository,
    private readonly batchFileQueueRepository: BatchFileQueueRepository,
  ) {}

  async execute(batchId: string) {
    const batch = await this.batchFileRepository.findById(batchId);
    const completedItems = batch.items.filter(
      (item) => item.status === 'completed',
    ).length;
    const failedItems = batch.items.filter(
      (item) => item.status === 'failed',
    ).length;
    const activeItems = batch.items.filter((item) =>
      ['pending', 'extracting', 'transcribing', 'translating'].includes(
        item.status,
      ),
    ).length;
    const totalProgress = batch.items.reduce(
      (sum, item) => sum + item.progress,
      0,
    );
    const status: BatchFileStatus =
      activeItems > 0
        ? 'processing'
        : failedItems === 0
          ? 'completed'
          : completedItems > 0
            ? 'partial'
            : 'failed';

    await this.batchFileRepository.patchBatch(batchId, {
      status,
      progress: Math.round(totalProgress / Math.max(batch.total_items, 1)),
      completed_items: completedItems,
      failed_items: failedItems,
    });

    if (['completed', 'failed', 'partial'].includes(status)) {
      await this.batchFileQueueRepository.enqueueCleanupStorage({ batchId });
    }
  }
}
