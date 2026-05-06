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
import { AxiosError, type AxiosResponse } from 'axios';
import FormData from 'form-data';
import { createWriteStream } from 'fs';
import { mkdir, readFile, stat } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import { firstValueFrom } from 'rxjs';
import { AudioNormalizeService } from '../service/audio-normalize.service';

export interface FilterNoiseAudioResult {
  path: string;
  mimeType: 'audio/wav';
  filename: string;
}

@Injectable()
export class AiFilterNoiseUseCase {
  private readonly logger = new Logger(AiFilterNoiseUseCase.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly audioNormalizeService: AudioNormalizeService,
    @Inject(aiCoreConfig.KEY)
    private readonly config: ConfigType<typeof aiCoreConfig>,
  ) {}

  async execute(file: Express.Multer.File): Promise<FilterNoiseAudioResult> {
    if (!file) {
      throw new UnprocessableEntityException(
        'Vui lòng đính kèm file audio hoặc video',
      );
    }

    if (!this.isAudioOrVideo(file.mimetype)) {
      throw new BadRequestException('File must be an audio or video');
    }

    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname || 'audio',
      contentType: file.mimetype,
      knownLength: file.size,
    });

    const url = `${this.config.filterNoise.url}/`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<Readable, FormData>(url, formData, {
          headers: {
            ...formData.getHeaders(),
            Accept: 'audio/wav, audio/*, application/octet-stream',
            'ngrok-skip-browser-warning': 'true',
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          responseType: 'stream',
        }),
      );

      const filteredAudioPath = await this.saveFilteredStream(response.data);
      await this.assertFilteredPayloadLooksLikeAudio(
        filteredAudioPath,
        response.headers?.['content-type'],
      );
      let normalizedAudio: Awaited<
        ReturnType<AudioNormalizeService['normalizeForAi']>
      >;

      try {
        normalizedAudio = await this.normalizeFilteredOutput(filteredAudioPath);
      } finally {
        await this.audioNormalizeService.cleanup(filteredAudioPath);
      }

      return {
        path: normalizedAudio.path,
        mimeType: normalizedAudio.mimeType,
        filename: this.buildOutputFilename(file.originalname),
      };
    } catch (error) {
      return this.handleUpstreamError(error, url, file);
    }
  }

  private isAudioOrVideo(mimeType?: string) {
    return (
      typeof mimeType === 'string' &&
      (mimeType.startsWith('audio/') || mimeType.startsWith('video/'))
    );
  }

  private buildOutputFilename(originalName?: string) {
    const baseName = (originalName || 'audio')
      .replace(/\.[^.]+$/, '')
      .replace(/[^\x20-\x7e]+/g, '-')
      .replace(/"/g, '')
      .trim();

    return `${baseName || 'audio'}-filtered.wav`;
  }

  private async saveFilteredStream(stream: Readable) {
    const outputDir = path.join(os.tmpdir(), 'identify-voice-api');
    await mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `filtered_audio_${uuidv4()}.wav`);
    await pipeline(stream, createWriteStream(outputPath));

    return outputPath;
  }

  private async normalizeFilteredOutput(filePath: string) {
    try {
      return await this.audioNormalizeService.normalizeForAi(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Filter-noise output không decode được như container audio, thử đọc như raw PCM s16le 16kHz mono: ${message}`,
      );

      return this.audioNormalizeService.normalizeRawPcm16ForAi(filePath);
    }
  }

  private async assertFilteredPayloadLooksLikeAudio(
    filePath: string,
    contentTypeHeader: unknown,
  ) {
    const fileStat = await stat(filePath);
    const header = await readFile(filePath, { encoding: null });
    const firstBytes = header.subarray(0, 64);
    const asciiPreview = firstBytes.toString('utf8').replace(/\s+/g, ' ');
    const contentType =
      typeof contentTypeHeader === 'string' ? contentTypeHeader : '';
    const looksLikeAudio =
      contentType.startsWith('audio/') ||
      contentType.includes('octet-stream') ||
      firstBytes.subarray(0, 4).toString('ascii') === 'RIFF' ||
      firstBytes.subarray(0, 3).toString('ascii') === 'ID3' ||
      (firstBytes[0] === 0xff && (firstBytes[1] & 0xe0) === 0xe0) ||
      firstBytes.subarray(0, 4).toString('ascii') === 'OggS' ||
      firstBytes.subarray(4, 8).toString('ascii') === 'ftyp';

    if (looksLikeAudio) {
      return;
    }

    this.logger.error(
      `AI Filter Noise returned non-audio payload: contentType=${contentType || 'N/A'} size=${fileStat.size} preview=${asciiPreview}`,
    );

    throw new BadGatewayException(
      `AI Core filter-noise không trả về audio hợp lệ. content-type=${contentType || 'N/A'}, preview=${asciiPreview}`,
    );
  }

  private async handleUpstreamError(
    error: unknown,
    url: string,
    file: Express.Multer.File,
  ): Promise<never> {
    if (error instanceof AxiosError) {
      const upstreamStatus = error.response?.status;
      const upstreamData = await this.readUpstreamErrorData(error.response);
      const upstreamMessage = this.getUpstreamErrorMessage(upstreamData);

      this.logger.error(
        `AI Filter Noise Error [POST ${url}] status=${upstreamStatus ?? 'N/A'} file=${file.originalname} mimetype=${file.mimetype} size=${file.size}: ${error.message}`,
        upstreamData,
      );

      if (upstreamStatus === 400) {
        throw new BadRequestException(upstreamMessage);
      }

      throw new BadGatewayException(upstreamMessage);
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new InternalServerErrorException(
      `Lỗi khi gọi AI filter-noise: ${message}`,
    );
  }

  private async readUpstreamErrorData(response?: AxiosResponse<unknown>) {
    const data = response?.data;

    if (data instanceof Readable) {
      const text = await this.readStreamAsText(data);

      try {
        return JSON.parse(text) as unknown;
      } catch {
        return text;
      }
    }

    return data;
  }

  private async readStreamAsText(stream: Readable) {
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks).toString('utf8');
  }

  private getUpstreamErrorMessage(data: unknown) {
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      const payload = data as Record<string, unknown>;
      const message = payload.message ?? payload.detail ?? payload.error;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return JSON.stringify(message);
    }

    return 'Lỗi filter-noise từ AI CORE';
  }
}
