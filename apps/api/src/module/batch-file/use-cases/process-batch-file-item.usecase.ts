import { BadRequestError } from '@/common/response';
import { AiExtractionJobService } from '@/module/ai-core/service/ai-extraction-job.service';
import { AiOcrUseCase } from '@/module/ai-core/usecase/ai-ocr.usecase';
import { AiSpeechToTextUseCase } from '@/module/ai-core/usecase/ai-speech-to-text.usecase';
import { AiTranslateUseCase } from '@/module/ai-core/usecase/ai-translate.usecase';
import { TranslationHistoryService } from '@/module/translation-history/service/translation-history.service';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable, Logger } from '@nestjs/common';
import { BatchFileTranslateDto } from '../dto/batch-file-translate.dto';
import { BatchFileRepository } from '../repository/batch-file.repository';
import { BatchFileSourceType } from '../types/batch-file.types';
import {
  Semaphore,
  getSourceFileType,
  isAudioFile,
  isPdfFile,
  sleep,
} from './batch-file.helpers';
import { RefreshBatchFileSummaryUseCase } from './refresh-batch-file-summary.usecase';

export interface ProcessBatchFileItemInput {
  batchId: string;
  itemId: string;
  file: Express.Multer.File;
  dto: BatchFileTranslateDto;
  userId?: string;
  extractionSemaphore?: Semaphore;
  translateSemaphore?: Semaphore;
}

@Injectable()
export class ProcessBatchFileItemUseCase implements BaseUseCase<
  ProcessBatchFileItemInput,
  Promise<void>
> {
  private readonly logger = new Logger(ProcessBatchFileItemUseCase.name);

  constructor(
    private readonly batchFileRepository: BatchFileRepository,
    private readonly speechToTextUseCase: AiSpeechToTextUseCase,
    private readonly ocrUseCase: AiOcrUseCase,
    private readonly extractionJobService: AiExtractionJobService,
    private readonly translateUseCase: AiTranslateUseCase,
    private readonly translationHistoryService: TranslationHistoryService,
    private readonly refreshBatchFileSummaryUseCase: RefreshBatchFileSummaryUseCase,
  ) {}

  async execute(input: ProcessBatchFileItemInput) {
    const sourceFileType = getSourceFileType(input.file);
    const extractionSemaphore = input.extractionSemaphore ?? new Semaphore(1);
    const translateSemaphore = input.translateSemaphore ?? new Semaphore(1);

    try {
      await this.batchFileRepository.patchItem(input.batchId, input.itemId, {
        status: sourceFileType === 'audio' ? 'transcribing' : 'extracting',
        progress: 5,
        error: undefined,
        source_file_type: sourceFileType,
      });

      const sourceText = await extractionSemaphore.run(() =>
        this.extractSourceText(
          input.batchId,
          input.itemId,
          input.file,
          input.dto,
        ),
      );

      if (!sourceText) {
        throw new BadRequestError(
          sourceFileType === 'audio'
            ? 'Không nhận dạng được nội dung audio.'
            : 'Không OCR được nội dung tài liệu.',
        );
      }

      await this.batchFileRepository.patchItem(input.batchId, input.itemId, {
        status: 'translating',
        progress: 45,
        transcript: sourceText,
      });

      let progressUpdate = Promise.resolve();
      const translateResult = await translateSemaphore.run(() =>
        this.translateUseCase.executeWithProgress(
          {
            source_text: sourceText,
            source_lang: input.dto.source_lang,
            target_lang: input.dto.target_lang ?? 'en',
            source_file_type: sourceFileType,
          },
          (progress, translatedText) => {
            progressUpdate = progressUpdate.then(() =>
              this.batchFileRepository.patchItem(input.batchId, input.itemId, {
                status: 'translating',
                progress: 45 + Math.round(Math.min(progress, 100) * 0.5),
                ...(translatedText ? { translated_text: translatedText } : {}),
              }),
            );
          },
        ),
      );

      await progressUpdate;
      const translatedText = this.getTranslatedText(translateResult);
      const historyRecord = await this.recordTranslation(
        sourceText,
        translatedText,
        input.dto,
        sourceFileType,
        input.userId,
      );

      await this.batchFileRepository.patchItem(input.batchId, input.itemId, {
        status: 'completed',
        progress: 100,
        translated_text: translatedText,
        source_file_type: sourceFileType,
        history_record_id: this.getHistoryId(historyRecord),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Batch file item ${input.itemId} failed: ${message}`);

      await this.batchFileRepository.patchItem(input.batchId, input.itemId, {
        status: 'failed',
        progress: 100,
        error: message,
      });
    } finally {
      await this.refreshBatchFileSummaryUseCase.execute(input.batchId);
    }
  }

  private async extractSourceText(
    batchId: string,
    itemId: string,
    file: Express.Multer.File,
    dto: BatchFileTranslateDto,
  ) {
    if (isAudioFile(file)) {
      const speechResult = await this.speechToTextUseCase.execute(file, {
        language: dto.source_lang,
        return_timestamp: dto.return_timestamp ?? false,
        denoise_audio: dto.denoise_audio ?? false,
      });

      return this.getTranscriptText(speechResult);
    }

    if (isPdfFile(file)) {
      return this.extractPdfTextWithPreview(batchId, itemId, file, dto);
    }

    const ocrResult = await this.ocrUseCase.execute(file, {
      language: dto.source_lang,
      format: true,
    });

    return this.getOcrText(ocrResult);
  }

  private async extractPdfTextWithPreview(
    batchId: string,
    itemId: string,
    file: Express.Multer.File,
    dto: BatchFileTranslateDto,
  ) {
    const createdJob = await this.extractionJobService.createOcrJob(file, {
      language: dto.source_lang,
      format: true,
    });
    let lastPreview = '';

    while (true) {
      const job = await this.extractionJobService.getJob(createdJob.job_id);
      const previewText = this.getOcrText(job.result);
      const nextProgress = Math.min(
        44,
        Math.max(5, Math.round(job.progress * 0.4)),
      );

      if (previewText && previewText !== lastPreview) {
        lastPreview = previewText;
        await this.batchFileRepository.patchItem(batchId, itemId, {
          status: 'extracting',
          progress: nextProgress,
          transcript: previewText,
        });
      } else {
        await this.batchFileRepository.patchItem(batchId, itemId, {
          status: 'extracting',
          progress: nextProgress,
        });
      }

      if (job.status === 'completed') {
        return this.getOcrText(job.result);
      }

      if (job.status === 'failed') {
        this.logger.warn(
          `Batch file item ${itemId} PDF page-batch OCR failed, fallback to full-file OCR: ${job.error ?? 'unknown error'}`,
        );
        return this.extractPdfTextDirectly(batchId, itemId, file, dto);
      }

      await sleep(1000);
    }
  }

  private async extractPdfTextDirectly(
    batchId: string,
    itemId: string,
    file: Express.Multer.File,
    dto: BatchFileTranslateDto,
  ) {
    await this.batchFileRepository.patchItem(batchId, itemId, {
      status: 'extracting',
      progress: 35,
      transcript: undefined,
    });

    const ocrResult = await this.ocrUseCase.execute(file, {
      language: dto.source_lang,
      format: true,
    });
    const sourceText = this.getOcrText(ocrResult);

    if (sourceText) {
      await this.batchFileRepository.patchItem(batchId, itemId, {
        status: 'extracting',
        progress: 44,
        transcript: sourceText,
      });
    }

    return sourceText;
  }

  private getTranscriptText(result: unknown) {
    if (!result || typeof result !== 'object') return '';

    const payload = result as Record<string, unknown>;
    const transcript =
      payload.transcript ?? payload.text ?? payload.transcript_text;

    if (typeof transcript === 'string') return transcript.trim();

    if (Array.isArray(transcript)) {
      return transcript
        .map((segment) =>
          segment && typeof segment === 'object'
            ? (segment as Record<string, unknown>).text
            : segment,
        )
        .filter((text): text is string => typeof text === 'string')
        .join('\n')
        .trim();
    }

    return '';
  }

  private getOcrText(result: unknown) {
    if (!result || typeof result !== 'object') return '';

    const results = (result as Record<string, unknown>).results;

    if (typeof results === 'string') {
      return results.trim();
    }

    if (Array.isArray(results)) {
      return results
        .map((page) => this.getOcrPageText(page))
        .filter(Boolean)
        .join('\n\n')
        .trim();
    }

    return '';
  }

  private getOcrPageText(page: unknown) {
    if (!page || typeof page !== 'object') return '';

    const record = page as Record<string, unknown>;
    if (typeof record.text === 'string') {
      return record.text.trim();
    }

    const pageResult = record.result;
    if (!Array.isArray(pageResult)) return '';

    return pageResult
      .map((item) =>
        item && typeof item === 'object'
          ? (item as Record<string, unknown>).text
          : undefined,
      )
      .filter((text): text is string => typeof text === 'string')
      .map((text) => text.trim())
      .filter(Boolean)
      .join('\n');
  }

  private getTranslatedText(result: unknown) {
    if (!result || typeof result !== 'object') return '';
    const translatedText = (result as Record<string, unknown>).translated_text;

    return typeof translatedText === 'string' ? translatedText.trim() : '';
  }

  private getHistoryId(historyRecord: unknown) {
    if (!historyRecord || typeof historyRecord !== 'object') return undefined;
    const id = (historyRecord as Record<string, unknown>).id;

    return typeof id === 'string' ? id : undefined;
  }

  private async recordTranslation(
    sourceText: string,
    translatedText: string,
    dto: BatchFileTranslateDto,
    sourceFileType: BatchFileSourceType,
    userId?: string,
  ) {
    if (!userId || !sourceText.trim() || !translatedText.trim()) return null;

    return this.translationHistoryService.recordTranslation({
      userId,
      sourceText,
      translatedText,
      sourceLang: dto.source_lang,
      targetLang: dto.target_lang,
      sourceFileType,
      mode: 'translate',
    });
  }
}
