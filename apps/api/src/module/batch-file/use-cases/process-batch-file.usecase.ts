import batchFileConfig from '@/config/batch-file.config';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { BatchFileTranslateDto } from '../dto/batch-file-translate.dto';
import { BatchFileRepository } from '../repository/batch-file.repository';
import { BatchFileStorageRepository } from '../repository/batch-file-storage.repository';
import { Semaphore, getSourceFileType } from './batch-file.helpers';
import { ProcessBatchFileItemUseCase } from './process-batch-file-item.usecase';
import { RefreshBatchFileSummaryUseCase } from './refresh-batch-file-summary.usecase';

export interface ProcessBatchFileInput {
  batchId: string;
  dto: BatchFileTranslateDto;
  userId?: string;
}

@Injectable()
export class ProcessBatchFileUseCase implements BaseUseCase<
  ProcessBatchFileInput,
  Promise<void>
> {
  constructor(
    private readonly batchFileRepository: BatchFileRepository,
    private readonly batchFileStorageRepository: BatchFileStorageRepository,
    private readonly processBatchFileItemUseCase: ProcessBatchFileItemUseCase,
    private readonly refreshBatchFileSummaryUseCase: RefreshBatchFileSummaryUseCase,
    @Inject(batchFileConfig.KEY)
    private readonly config: ConfigType<typeof batchFileConfig>,
  ) {}

  async execute(input: ProcessBatchFileInput) {
    const batch = await this.batchFileRepository.findById(input.batchId);
    const extractionSemaphore = new Semaphore(
      this.config.extractionConcurrency,
    );
    const ocrSemaphore = new Semaphore(this.config.ocrConcurrency);
    const translateSemaphore = new Semaphore(this.config.translateConcurrency);

    await this.batchFileRepository.patchBatch(input.batchId, {
      status: 'processing',
    });

    await Promise.all(
      batch.items.map(async (item) => {
        if (item.status === 'completed') {
          return;
        }

        const file =
          await this.batchFileStorageRepository.getUploadedFile(item);
        if (!file) {
          await this.batchFileRepository.patchItem(
            input.batchId,
            item.item_id,
            {
              status: 'failed',
              progress: 100,
              error: 'Không còn file gốc để xử lý.',
            },
          );
          return;
        }
        const itemDto: BatchFileTranslateDto = {
          ...input.dto,
          source_lang: item.source_lang as BatchFileTranslateDto['source_lang'],
          target_lang: item.target_lang as BatchFileTranslateDto['target_lang'],
          return_timestamp: item.return_timestamp,
          denoise_audio: item.denoise_audio,
        };

        await this.processBatchFileItemUseCase.execute({
          batchId: input.batchId,
          itemId: item.item_id,
          file,
          dto: itemDto,
          userId: input.userId,
          extractionSemaphore:
            getSourceFileType(file) === 'audio'
              ? extractionSemaphore
              : ocrSemaphore,
          translateSemaphore,
        });
      }),
    );

    await this.refreshBatchFileSummaryUseCase.execute(input.batchId);
  }
}
