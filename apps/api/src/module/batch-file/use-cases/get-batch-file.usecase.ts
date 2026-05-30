import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import { BatchFileRepository } from '../repository/batch-file.repository';
import { BatchFileState } from '../types/batch-file.types';

@Injectable()
export class GetBatchFileUseCase implements BaseUseCase<
  string,
  Promise<BatchFileState>
> {
  constructor(private readonly batchFileRepository: BatchFileRepository) {}

  execute(batchId: string) {
    return this.batchFileRepository.findById(batchId);
  }
}
