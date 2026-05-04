import { aiCoreConfig } from '@/config';
import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
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
import * as path from 'path';
import { catchError, firstValueFrom } from 'rxjs';
import { SpeechToTextRequestDto } from '../dto/speech-to-text-request.dto';

const S2T_FORCE_SIMPLE_OPTIONS_SIZE_BYTES = 50 * 1024 * 1024;

@Injectable()
export class AiSpeechToTextUseCase {
  private readonly logger = new Logger(AiSpeechToTextUseCase.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(aiCoreConfig.KEY)
    private readonly config: ConfigType<typeof aiCoreConfig>,
  ) {}

  private getUpstreamErrorMessage(data: unknown) {
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      const payload = data as Record<string, unknown>;
      const message = payload.message ?? payload.detail ?? payload.error;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return JSON.stringify(message);
    }

    return 'Lỗi Speech-to-Text từ AI CORE';
  }

  private getForwardedFileName(file: Express.Multer.File) {
    const extFromName = path.extname(file.originalname).toLowerCase();
    const extFromMime: Record<string, string> = {
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'audio/x-wav': '.wav',
      'audio/webm': '.webm',
      'audio/ogg': '.ogg',
      'audio/flac': '.flac',
      'audio/mp4': '.m4a',
      'video/mp4': '.mp4',
      'audio/x-m4a': '.m4a',
    };
    const ext = /^[a-z0-9.]{2,8}$/.test(extFromName)
      ? extFromName
      : (extFromMime[file.mimetype] ?? '.bin');

    return `speech-to-text-input${ext}`;
  }

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

  private shouldForceSimpleOptions(file: Express.Multer.File) {
    return file.size > S2T_FORCE_SIMPLE_OPTIONS_SIZE_BYTES;
  }

  async execute(file: Express.Multer.File, dto: SpeechToTextRequestDto) {
    if (!file) {
      throw new UnprocessableEntityException('Vui lòng đính kèm file audio');
    }

    const forwardedFileName = this.getForwardedFileName(file);
    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: forwardedFileName,
      contentType: file.mimetype,
      knownLength: file.size,
    });

    const forceSimpleOptions = this.shouldForceSimpleOptions(file);
    const params = {
      ...(dto.language ? { language: dto.language } : {}),
      return_timestamp: dto.return_timestamp ?? false,
      denoise_audio: forceSimpleOptions ? false : (dto.denoise_audio ?? false),
    };

    if (forceSimpleOptions) {
      this.logger.warn(
        `S2T file lớn hơn 50MB, ép denoise_audio=false: file=${file.originalname} size=${file.size}`,
      );
    }

    const url = `${this.config.speechToText.url}/s2t_ml`;
    const contentLength = await this.getFormDataLength(formData);

    try {
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
                const upstreamStatus = error.response?.status;
                const upstreamData = error.response?.data;

                this.logger.error(
                  `AI S2T Error [POST ${url}] status=${upstreamStatus ?? 'N/A'} originalFile=${file.originalname} forwardedFile=${forwardedFileName} size=${file.size} forwardedContentLength=${contentLength} params=${JSON.stringify(params)}: ${error.message}`,
                  upstreamData,
                );

                if (upstreamStatus === 400) {
                  throw new BadRequestException(upstreamData);
                }

                throw new BadGatewayException(
                  this.getUpstreamErrorMessage(upstreamData),
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
        error instanceof BadGatewayException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Lỗi khi gọi AI Speech-to-Text: ${error.message}`,
      );
    }
  }
}
