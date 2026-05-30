import { aiCoreConfig } from '@/config';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { AxiosError, AxiosResponse } from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { catchError, firstValueFrom } from 'rxjs';
import { OcrRequestDto } from '../dto/ocr-request.dto';
import type { OcrLanguage } from '../constants/languages';

const DEFAULT_OCR_LANGUAGE: OcrLanguage = 'vi';

@Injectable()
export class AiOcrUseCase {
  private readonly logger = new Logger(AiOcrUseCase.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(aiCoreConfig.KEY)
    private readonly config: ConfigType<typeof aiCoreConfig>,
  ) {}

  private getFormDataLength(formData: FormData): Promise<number> {
    return new Promise((resolve, reject) => {
      formData.getLength((error, length) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(length);
      });
    });
  }

  async execute(file: Express.Multer.File, dto: OcrRequestDto) {
    if (!file) {
      throw new UnprocessableEntityException('Vui lòng đính kèm file OCR');
    }

    const formData = new FormData();
    const filePayload =
      file.buffer ?? (file.path && createReadStream(file.path));
    if (!filePayload) {
      throw new UnprocessableEntityException('Không đọc được file OCR');
    }

    const knownLength =
      file.buffer?.length ??
      file.size ??
      (file.path ? (await stat(file.path)).size : undefined);

    formData.append('file', filePayload, {
      filename: file.originalname,
      contentType: file.mimetype,
      ...(knownLength ? { knownLength } : {}),
    });

    formData.append('language', dto.language ?? DEFAULT_OCR_LANGUAGE);

    const params = {
      format: dto.format ?? false,
    };

    const url = `${this.config.ocr.url}/ocr/`;

    try {
      const contentLength = await this.getFormDataLength(formData);

      this.logger.debug(
        `AI OCR Request [POST ${url}] file=${file.originalname} mimetype=${file.mimetype} size=${knownLength ?? 'unknown'} hasBuffer=${Boolean(file.buffer)} hasPath=${Boolean(file.path)} contentLength=${contentLength} language=${dto.language ?? DEFAULT_OCR_LANGUAGE} format=${params.format}`,
      );

      const response = (await firstValueFrom(
        this.httpService
          .post<any, FormData>(url, formData, {
            headers: {
              ...formData.getHeaders(),
              'Content-Length': contentLength,
            },
            params,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          })
          .pipe(
            catchError<AxiosResponse<any, FormData>, any>(
              (error: AxiosError) => {
                this.logger.error(
                  `AI OCR Error [POST /ocr/]: ${error.message}`,
                  error.response?.data,
                );

                if (error.response?.status === 400) {
                  throw new BadRequestException(error.response.data);
                }

                throw new InternalServerErrorException(
                  (error.response?.data as any)?.message ||
                    (error.response?.data as any)?.detail ||
                    'Lỗi OCR từ AI CORE',
                );
              },
            ),
          ),
      )) as AxiosResponse<any>;

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
        `Lỗi khi gọi AI OCR: ${error.message}`,
      );
    }
  }
}
