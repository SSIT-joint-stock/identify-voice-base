import { aiCoreConfig } from '@/config';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import {
  DetectLanguageRequestDto,
  TranslateRequestDto,
} from '../dto/translate-request.dto';

type TranslationCoreRequest = Record<string, string>;
type TranslationCoreResponse = Record<string, unknown>;
export type TranslationPartialCallback = (
  progress: number,
  translatedText?: string,
  processedChunks?: number,
  totalChunks?: number,
) => void;

const MIN_CHARACTER_CHUNK_LIMIT = 1200;

@Injectable()
export class AiTranslateUseCase {
  private readonly logger = new Logger(AiTranslateUseCase.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(aiCoreConfig.KEY)
    private readonly config: ConfigType<typeof aiCoreConfig>,
  ) {}

  async execute(dto: TranslateRequestDto) {
    return this.translateInChunks('/translate', dto);
  }

  async executeWithProgress(
    dto: TranslateRequestDto,
    onProgress: TranslationPartialCallback,
  ) {
    return this.translateInChunks('/translate', dto, onProgress);
  }

  async detectLanguage(dto: DetectLanguageRequestDto) {
    return this.postToTranslationCore('/detect_language', {
      text: dto.text,
    });
  }

  async translateSummarize(dto: TranslateRequestDto) {
    return this.translateInChunks('/translate_summarize', dto);
  }

  async translateSummarizeWithProgress(
    dto: TranslateRequestDto,
    onProgress: TranslationPartialCallback,
  ) {
    return this.translateInChunks('/translate_summarize', dto, onProgress);
  }

  private async translateInChunks(
    path: string,
    dto: TranslateRequestDto,
    onProgress?: TranslationPartialCallback,
  ) {
    const targetLang = dto.target_lang ?? 'en';
    const chunkWordLimit = this.config.translation.chunkWordLimit;
    const chunks = this.splitTextForTranslation(
      dto.source_text,
      chunkWordLimit,
    );
    const baseRequest = this.getTranslationCoreRequest(dto, targetLang);

    if (chunks.length <= 1) {
      onProgress?.(10);
      const response = await this.postToTranslationCore(path, {
        ...baseRequest,
        source_text: dto.source_text,
      });
      onProgress?.(100, this.getTranslatedText(response), 1, 1);

      return response;
    }

    this.logger.log(
      `Split translation payload into ${chunks.length} chunks (${chunkWordLimit} words/chunk) for ${path}`,
    );

    const responses: TranslationCoreResponse[] = [];

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];

      const response = await this.postToTranslationCore(path, {
        ...baseRequest,
        source_text: chunk,
      });
      responses.push(response);

      const translatedText = responses
        .map((item) => this.getTranslatedText(item))
        .filter((text) => text.length > 0)
        .join('\n\n');

      onProgress?.(
        Math.round(((index + 1) / chunks.length) * 100),
        translatedText,
        index + 1,
        chunks.length,
      );
    }

    const translatedText = responses
      .map((response) => this.getTranslatedText(response))
      .filter((text) => text.length > 0)
      .join('\n\n');

    return {
      ...responses[0],
      original_text: dto.source_text,
      translated_text: translatedText,
      target_lang: targetLang,
    };
  }

  private async postToTranslationCore(
    path: string,
    body: TranslationCoreRequest,
  ): Promise<TranslationCoreResponse> {
    const url = `${this.config.translation.url}${path}`;

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<TranslationCoreResponse, TranslationCoreRequest>(url, body)
          .pipe(
            catchError((error: AxiosError<unknown, TranslationCoreRequest>) => {
              this.logger.error(
                `AI Translation Error [POST ${path}]: ${error.message}`,
                error.response?.data,
              );

              if (error.response?.status === 400) {
                throw new BadRequestException(error.response.data);
              }

              throw new InternalServerErrorException(
                this.getUpstreamErrorMessage(error.response?.data) ||
                  'Lỗi Translation từ AI CORE',
              );
            }),
          ),
      );

      return response.data;
    } catch (error) {
      console.log(error);
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Lỗi khi gọi AI Translation: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private getUpstreamErrorMessage(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') {
      return undefined;
    }

    const record = data as Record<string, unknown>;
    const message = record.message ?? record.detail;

    return typeof message === 'string' ? message : undefined;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getTranslatedText(response: TranslationCoreResponse): string {
    const translatedText = response.translated_text;

    return typeof translatedText === 'string' ? translatedText.trim() : '';
  }

  private getTranslationCoreRequest(
    dto: TranslateRequestDto,
    targetLang: string,
  ): TranslationCoreRequest {
    return {
      target_lang: targetLang,
      ...(dto.source_lang ? { source_lang: dto.source_lang } : {}),
    };
  }

  private splitTextForTranslation(text: string, wordLimit: number): string[] {
    const characterLimit = Math.max(
      this.config.translation.chunkCharacterLimit,
      MIN_CHARACTER_CHUNK_LIMIT,
    );

    if (text.trim().length > characterLimit) {
      return this.splitTextByCharacterLimit(text, characterLimit);
    }

    const wordChunks = this.splitTextByWordLimit(text, wordLimit);

    if (wordChunks.length > 1) {
      return wordChunks;
    }

    return wordChunks;
  }

  private splitTextByWordLimit(text: string, wordLimit: number): string[] {
    const chunks: string[] = [];
    const wordMatches = text.matchAll(/\S+/g);
    let chunkStartIndex: number | null = null;
    let currentWordCount = 0;

    for (const match of wordMatches) {
      if (chunkStartIndex === null) {
        chunkStartIndex = match.index;
      }

      if (
        currentWordCount >= wordLimit &&
        chunkStartIndex !== null &&
        match.index !== undefined
      ) {
        const chunk = text.slice(chunkStartIndex, match.index).trim();
        if (chunk) {
          chunks.push(chunk);
        }

        chunkStartIndex = match.index;
        currentWordCount = 0;
      }

      currentWordCount += 1;
    }

    if (chunkStartIndex !== null) {
      const chunk = text.slice(chunkStartIndex).trim();
      if (chunk) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  private splitTextByCharacterLimit(text: string, characterLimit: number) {
    const chunks: string[] = [];
    let remainingText = text.trim();

    while (remainingText.length > characterLimit) {
      const splitIndex = this.findCharacterChunkSplitIndex(
        remainingText,
        characterLimit,
      );
      const chunk = remainingText.slice(0, splitIndex).trim();

      if (chunk) {
        chunks.push(chunk);
      }

      remainingText = remainingText.slice(splitIndex).trim();
    }

    if (remainingText) {
      chunks.push(remainingText);
    }

    return chunks;
  }

  private findCharacterChunkSplitIndex(text: string, characterLimit: number) {
    const searchWindow = text.slice(0, characterLimit);
    // Sử dụng greedy .* để tìm điểm ngắt câu (dấu chấm, chấm hỏi, chấm than, xuống dòng) cuối cùng trong cửa sổ tìm kiếm
    const match = searchWindow.match(/.*[。．.!！?？\n]\s*/su);

    if (match && match[0].length > characterLimit / 2) {
      return match[0].length;
    }

    return characterLimit;
  }
}
