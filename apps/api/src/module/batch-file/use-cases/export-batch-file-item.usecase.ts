import { NotFoundError } from '@/common/response';
import type { TranslateExportFormat } from '@/module/ai-core/dto/translate-request.dto';
import { TranslateExportService } from '@/module/ai-core/service/translate-export.service';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { BatchFileRepository } from '../repository/batch-file.repository';
import { withoutExtension } from './batch-file.helpers';

export interface ExportBatchFileItemInput {
  batchId: string;
  itemId: string;
  format?: TranslateExportFormat;
}

@Injectable()
export class ExportBatchFileItemUseCase implements BaseUseCase<
  ExportBatchFileItemInput,
  Promise<{ buffer: Buffer; filename: string; mimeType: string }>
> {
  constructor(
    private readonly batchFileRepository: BatchFileRepository,
    private readonly translateExportService: TranslateExportService,
  ) {}

  async execute(input: ExportBatchFileItemInput) {
    const batch = await this.batchFileRepository.findById(input.batchId);
    const item = batch.items.find((entry) => entry.item_id === input.itemId);

    if (!item) {
      throw new NotFoundError('Item dịch file không tồn tại.');
    }

    if (!item.translated_text?.trim()) {
      throw new UnprocessableEntityException(
        'Item chưa có bản dịch để export.',
      );
    }

    return this.translateExportService.export({
      text: item.translated_text,
      format: input.format ?? 'docx',
      filename: withoutExtension(item.filename),
      title: `Bản dịch - ${item.filename}`,
    });
  }
}
