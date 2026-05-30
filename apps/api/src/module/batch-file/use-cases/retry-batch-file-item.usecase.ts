import { NotFoundError } from '@/common/response';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import { RetryBatchFileItemDto } from '../dto/batch-file-translate.dto';
import { BatchFileQueueRepository } from '../repository/batch-file-queue.repository';
import { BatchFileRepository } from '../repository/batch-file.repository';

export interface RetryBatchFileItemInput {
  batchId: string;
  itemId: string;
  dto?: RetryBatchFileItemDto;
  userId?: string;
}

@Injectable()
export class RetryBatchFileItemUseCase implements BaseUseCase<
  RetryBatchFileItemInput,
  Promise<{ batch_id: string; item_id: string; retried: true }>
> {
  constructor(
    private readonly batchFileRepository: BatchFileRepository,
    private readonly batchFileQueueRepository: BatchFileQueueRepository,
  ) {}

  async execute(input: RetryBatchFileItemInput) {
    const batch = await this.batchFileRepository.findById(input.batchId);
    const item = batch.items.find((entry) => entry.item_id === input.itemId);

    if (!item) {
      throw new NotFoundError('Item dịch file không tồn tại.');
    }

    await this.batchFileRepository.patchItem(input.batchId, input.itemId, {
      status: 'pending',
      progress: 0,
      error: undefined,
      transcript: undefined,
      translated_text: undefined,
      source_lang: input.dto?.source_lang ?? item.source_lang,
      target_lang: input.dto?.target_lang ?? item.target_lang,
      return_timestamp: input.dto?.return_timestamp ?? item.return_timestamp,
      denoise_audio: input.dto?.denoise_audio ?? item.denoise_audio,
    });
    await this.batchFileQueueRepository.enqueueRetryItem({
      batchId: input.batchId,
      itemId: input.itemId,
      userId: input.userId,
    });

    return {
      batch_id: input.batchId,
      item_id: input.itemId,
      retried: true as const,
    };
  }
}
