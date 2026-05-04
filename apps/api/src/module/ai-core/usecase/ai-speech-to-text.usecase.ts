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
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { catchError, firstValueFrom } from 'rxjs';
import { SpeechToTextRequestDto } from '../dto/speech-to-text-request.dto';
import { AudioNormalizeService } from '../service/audio-normalize.service';

const S2T_FORCE_SIMPLE_OPTIONS_SIZE_BYTES = 50 * 1024 * 1024;

@Injectable()
export class AiSpeechToTextUseCase {
  private readonly logger = new Logger(AiSpeechToTextUseCase.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly audioNormalizeService: AudioNormalizeService,
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

  private shouldForceSimpleOptions(fileSize: number) {
    return fileSize > S2T_FORCE_SIMPLE_OPTIONS_SIZE_BYTES;
  }

  async execute(file: Express.Multer.File, dto: SpeechToTextRequestDto) {
    if (!file) {
      throw new UnprocessableEntityException('Vui lòng đính kèm file audio');
    }

    const url = `${this.config.speechToText.url}/s2t_ml`;
    let normalizedAudioPath: string | null = null;

    try {
      const normalizedAudio =
        await this.audioNormalizeService.normalizeUploadedFileForAi(file);
      normalizedAudioPath = normalizedAudio.path;

      const normalizedAudioStat = await stat(normalizedAudio.path);
      const forwardedFileName = 'speech-to-text-input.wav';
      const formData = new FormData();
      formData.append('file', createReadStream(normalizedAudio.path), {
        filename: forwardedFileName,
        contentType: normalizedAudio.mimeType,
        knownLength: normalizedAudioStat.size,
      });

      const forceSimpleOptions = this.shouldForceSimpleOptions(
        normalizedAudioStat.size,
      );
      const params = {
        ...(dto.language ? { language: dto.language } : {}),
        return_timestamp: dto.return_timestamp ?? false,
        denoise_audio: forceSimpleOptions
          ? false
          : (dto.denoise_audio ?? false),
      };

      if (forceSimpleOptions) {
        this.logger.warn(
          `S2T file sau chuẩn hóa lớn hơn 50MB, ép denoise_audio=false: file=${file.originalname} normalizedFile=${forwardedFileName} originalSize=${file.size} normalizedSize=${normalizedAudioStat.size}`,
        );
      }

      const contentLength = await this.getFormDataLength(formData);

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
                  `AI S2T Error [POST ${url}] status=${upstreamStatus ?? 'N/A'} originalFile=${file.originalname} forwardedFile=${forwardedFileName} originalSize=${file.size} normalizedSize=${normalizedAudioStat.size} forwardedContentLength=${contentLength} params=${JSON.stringify(params)}: ${error.message}`,
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
      if (
        error instanceof BadRequestException ||
        error instanceof BadGatewayException ||
        error instanceof UnprocessableEntityException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Lỗi khi gọi AI Speech-to-Text: ${message}`,
      );
    } finally {
      await this.audioNormalizeService.cleanup(normalizedAudioPath);
    }
  }
}
