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
    return this.postToTranslationCore('/translate', {
      source_text: dto.source_text,
      target_lang: dto.target_lang ?? 'en',
    });
  }

  async detectLanguage(dto: DetectLanguageRequestDto) {
    return this.postToTranslationCore('/detect_language', {
      text: dto.text,
    });
  }

  async translateSummarize(dto: TranslateRequestDto) {
    return this.postToTranslationCore('/translate_summarize', {
      source_text: dto.source_text,
      target_lang: dto.target_lang ?? 'en',
    });
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
}
