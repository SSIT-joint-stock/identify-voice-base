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
import { catchError, firstValueFrom } from 'rxjs';
import { OcrRequestDto } from '../dto/ocr-request.dto';

@Injectable()
export class AiOcrUseCase {
  private readonly logger = new Logger(AiOcrUseCase.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(aiCoreConfig.KEY)
    private readonly config: ConfigType<typeof aiCoreConfig>,
  ) {}

  async execute(file: Express.Multer.File, dto: OcrRequestDto) {
    if (!file) {
      throw new UnprocessableEntityException('Vui lòng đính kèm file OCR');
    }

    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    if (dto.language !== undefined) {
      formData.append('language', dto.language);
    }

    const params = {
      format: dto.format ?? false,
    };

    const url = `${this.config.ocr.url}/ocr/`;

    try {
      const response = (await firstValueFrom(
        this.httpService
          .post<any, FormData>(url, formData, {
            headers: formData.getHeaders(),
            params,
            timeout: this.config.timeout,
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
