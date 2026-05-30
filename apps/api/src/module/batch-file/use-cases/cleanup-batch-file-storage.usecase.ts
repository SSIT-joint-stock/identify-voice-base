import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable, Logger } from '@nestjs/common';
import { BatchFileRepository } from '../repository/batch-file.repository';
import { BatchFileStorageRepository } from '../repository/batch-file-storage.repository';

@Injectable()
export class CleanupBatchFileStorageUseCase implements BaseUseCase<
  string,
  Promise<void>
> {
  private readonly logger = new Logger(CleanupBatchFileStorageUseCase.name);

  constructor(
    private readonly batchFileRepository: BatchFileRepository,
    private readonly batchFileStorageRepository: BatchFileStorageRepository,
  ) {}

  async execute(batchId: string) {
    const batch = await this.batchFileRepository.findById(batchId);
    const storageKeys = batch.items
      .map((item) => item.storage_key)
      .filter((key): key is string => Boolean(key));

    if (!storageKeys.length) return;

    await Promise.all(
      storageKeys.map((storageKey) =>
        this.batchFileStorageRepository.deleteUploadedFile(storageKey),
      ),
    );

    await this.batchFileRepository.save({
      ...batch,
      items: batch.items.map((item) => ({
        ...item,
        storage_key: undefined,
        updated_at: new Date().toISOString(),
      })),
      updated_at: new Date().toISOString(),
    });

    this.logger.debug(
      `Cleaned ${storageKeys.length} uploaded files for batch ${batchId}`,
    );
  }
}
