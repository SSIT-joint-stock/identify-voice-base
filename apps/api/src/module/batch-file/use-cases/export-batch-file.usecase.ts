import { BadRequestError } from '@/common/response';
import type { TranslateExportFormat } from '@/module/ai-core/dto/translate-request.dto';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import archiver from 'archiver';
import { BatchFileRepository } from '../repository/batch-file.repository';
import { ExportBatchFileItemUseCase } from './export-batch-file-item.usecase';

export interface ExportBatchFileInput {
  batchId: string;
  format?: TranslateExportFormat;
}

@Injectable()
export class ExportBatchFileUseCase implements BaseUseCase<
  ExportBatchFileInput,
  Promise<{ buffer: Buffer; filename: string; mimeType: string }>
> {
  constructor(
    private readonly batchFileRepository: BatchFileRepository,
    private readonly exportBatchFileItemUseCase: ExportBatchFileItemUseCase,
  ) {}

  async execute(input: ExportBatchFileInput) {
    const batch = await this.batchFileRepository.findById(input.batchId);
    const completedItems = batch.items.filter((item) =>
      item.translated_text?.trim(),
    );

    if (!completedItems.length) {
      throw new BadRequestError('Batch chưa có bản dịch hoàn tất để export.');
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    const bufferPromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('error', reject);
      archive.on('end', () => resolve(Buffer.concat(chunks)));
    });

    for (const item of completedItems) {
      const file = await this.exportBatchFileItemUseCase.execute({
        batchId: input.batchId,
        itemId: item.item_id,
        format: input.format ?? 'docx',
      });
      archive.append(file.buffer, { name: file.filename });
    }

    await archive.finalize();
    const buffer = await bufferPromise;

    return {
      buffer,
      filename: `batch-file-translation-${input.batchId}.zip`,
      mimeType: 'application/zip',
    };
  }
}
