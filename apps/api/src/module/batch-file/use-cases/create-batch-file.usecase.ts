import { BadRequestError } from '@/common/response';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  BatchFileItemOptionDto,
  BatchFileTranslateDto,
} from '../dto/batch-file-translate.dto';
import { BatchFileQueueRepository } from '../repository/batch-file-queue.repository';
import { BatchFileStorageRepository } from '../repository/batch-file-storage.repository';
import { BatchFileRepository } from '../repository/batch-file.repository';
import { BatchFileState } from '../types/batch-file.types';
import {
  getSourceFileType,
  normalizeUploadedFileName,
} from './batch-file.helpers';

export interface CreateBatchFileInput {
  files: Express.Multer.File[];
  dto: BatchFileTranslateDto;
  userId?: string;
}

@Injectable()
export class CreateBatchFileUseCase implements BaseUseCase<
  CreateBatchFileInput,
  Promise<{ batch_id: string }>
> {
  constructor(
    private readonly batchFileRepository: BatchFileRepository,
    private readonly batchFileStorageRepository: BatchFileStorageRepository,
    private readonly batchFileQueueRepository: BatchFileQueueRepository,
  ) {}

  async execute(input: CreateBatchFileInput) {
    if (!input.files?.length) {
      throw new BadRequestError('Vui lòng đính kèm ít nhất một file cần dịch.');
    }

    const batchId = randomUUID();
    const now = new Date().toISOString();
    const targetLang = input.dto.target_lang ?? 'en';
    const fileOptions = this.parseFileOptions(input.dto.file_options);
    const items = await Promise.all(
      input.files.map(async (file, index) => {
        const itemId = randomUUID();
        const fileOption = fileOptions[index] ?? {};
        const savedFile =
          await this.batchFileStorageRepository.saveUploadedFile(
            batchId,
            itemId,
            file,
          );

        return {
          item_id: itemId,
          filename: normalizeUploadedFileName(file.originalname),
          storage_key: savedFile.storageKey,
          mime_type: file.mimetype,
          size: file.size,
          status: 'pending' as const,
          progress: 0,
          target_lang: fileOption.target_lang ?? targetLang,
          source_lang: fileOption.source_lang ?? input.dto.source_lang,
          source_file_type: getSourceFileType(file),
          return_timestamp:
            fileOption.return_timestamp ?? input.dto.return_timestamp,
          denoise_audio: fileOption.denoise_audio ?? input.dto.denoise_audio,
          created_at: now,
          updated_at: now,
        };
      }),
    );
    const batch: BatchFileState = {
      batch_id: batchId,
      status: 'pending',
      progress: 0,
      total_items: items.length,
      completed_items: 0,
      failed_items: 0,
      items,
      created_at: now,
      updated_at: now,
    };

    await this.batchFileRepository.save(batch);
    await this.batchFileQueueRepository.enqueueProcess({
      batchId,
      dto: input.dto,
      userId: input.userId,
    });

    return { batch_id: batchId };
  }

  private parseFileOptions(value: string | undefined) {
    if (!value) return [] as BatchFileItemOptionDto[];

    try {
      const parsed = JSON.parse(value);

      return Array.isArray(parsed)
        ? parsed.map((option) =>
            option && typeof option === 'object'
              ? (option as BatchFileItemOptionDto)
              : {},
          )
        : [];
    } catch {
      throw new BadRequestError('File options không hợp lệ.');
    }
  }
}
