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

  async detectLanguage(dto: DetectLanguageRequestDto) {
    return this.postToTranslationCore('/detect_language', {
      text: dto.text,
    });
  }

  async translateSummarize(dto: TranslateRequestDto) {
    return this.translateInChunks('/translate_summarize', dto);
  }

  private async translateInChunks(path: string, dto: TranslateRequestDto) {
    const targetLang = dto.target_lang ?? 'en';
    const chunkWordLimit = this.config.translation.chunkWordLimit;
    const chunks = this.splitTextByWordLimit(dto.source_text, chunkWordLimit);

    if (chunks.length <= 1) {
      return this.postToTranslationCore(path, {
        source_text: dto.source_text,
        target_lang: targetLang,
      });
    }

    this.logger.log(
      `Split translation payload into ${chunks.length} chunks (${chunkWordLimit} words/chunk) for ${path}`,
    );

    const responses: TranslationCoreResponse[] = [];

    for (const chunk of chunks) {
      responses.push(
        await this.postToTranslationCore(path, {
          source_text: chunk,
          target_lang: targetLang,
        }),
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
          .post<TranslationCoreResponse, TranslationCoreRequest>(url, body, {
            timeout: this.config.timeout,
          })
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
}
