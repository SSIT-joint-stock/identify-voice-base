import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface NormalizedAudioFile {
  path: string;
  mimeType: 'audio/wav';
}

export class AudioNormalizeTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Audio normalization exceeded ${timeoutMs}ms`);
    this.name = AudioNormalizeTimeoutError.name;
  }
}

interface FfprobeAudioStream {
  codec_type?: string;
  codec_name?: string;
  sample_rate?: string | number;
  channels?: string | number;
  bit_rate?: string;
}

@Injectable()
export class AudioNormalizeService {
  private readonly logger = new Logger(AudioNormalizeService.name);

  async normalizeForAi(inputPath: string): Promise<NormalizedAudioFile> {
    const outputDir = path.join(os.tmpdir(), 'identify-voice-api');
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `ai_audio_${uuidv4()}.wav`);
    const timeoutMs = this.getNormalizeTimeoutMs();

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let timedOut = false;
      let timeoutHandle: NodeJS.Timeout | undefined;

      const settle = (callback: () => void) => {
        if (settled) return;
        settled = true;
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        callback();
      };

      const command = ffmpeg(inputPath)
        .outputOptions([
          '-y',
          '-vn',
          '-acodec pcm_s16le',
          '-ac 1',
          '-ar 16000',
          '-f wav',
        ])
        .on('start', (cmdLine) => {
          this.logger.debug(`Bắt đầu chuẩn hóa audio: ${cmdLine}`);
        })
        .on('error', (err: Error) => {
          if (timedOut) return;
          this.logger.error(`Lỗi chuẩn hóa audio: ${err.message}`);
          settle(() => {
            reject(
              new UnprocessableEntityException(
                'File audio không thể giải mã để chuẩn hóa, có thể đã bị hỏng hoặc dùng codec không được hỗ trợ. Vui lòng kiểm tra file gốc, xuất lại bản ghi và tải lên lại.',
              ),
            );
          });
        })
        .on('end', () => {
          this.logger.debug(`Hoàn thành chuẩn hóa audio: ${outputPath}`);
          settle(resolve);
        });

      if (timeoutMs > 0) {
        timeoutHandle = setTimeout(() => {
          timedOut = true;
          this.logger.warn(
            `Chuẩn hóa audio quá ${timeoutMs}ms, fallback sang file gốc: ${inputPath}`,
          );
          command.kill('SIGKILL');
          void fs.unlink(outputPath).catch(() => {});
          settle(() => reject(new AudioNormalizeTimeoutError(timeoutMs)));
        }, timeoutMs);
      }

      command.save(outputPath);
    });

    await this.assertNormalizedAudio(outputPath);

    return {
      path: outputPath,
      mimeType: 'audio/wav',
    };
  }

  async normalizeUploadedFileForAi(
    file: Express.Multer.File,
  ): Promise<NormalizedAudioFile> {
    if (!file) {
      throw new UnprocessableEntityException('Vui lòng đính kèm file audio.');
    }

    const outputDir = path.join(os.tmpdir(), 'identify-voice-api');
    await fs.mkdir(outputDir, { recursive: true });

    const extFromName = path.extname(file.originalname).toLowerCase();
    const inputPath =
      file.path ??
      path.join(outputDir, `raw_audio_${uuidv4()}${extFromName || '.bin'}`);

    if (!file.path) {
      await fs.writeFile(inputPath, file.buffer);
    }

    try {
      return await this.normalizeForAi(inputPath);
    } finally {
      if (!file.path) {
        await this.cleanup(inputPath);
      }
    }
  }

  async cleanup(filePath?: string | null): Promise<void> {
    if (!filePath) return;

    try {
      await fs.unlink(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Không thể xóa audio tạm ${filePath}: ${message}`);
    }
  }

  private getNormalizeTimeoutMs(): number {
    const raw = process.env.AUDIO_NORMALIZE_TIMEOUT_MS;
    const parsed = Number.parseInt(raw ?? '15000', 10);
    return Number.isFinite(parsed) ? parsed : 15000;
  }

  private async assertNormalizedAudio(filePath: string): Promise<void> {
    const audioStream = await new Promise<FfprobeAudioStream | undefined>(
      (resolve, reject) => {
        ffmpeg.ffprobe(filePath, (error, metadata) => {
          if (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
            return;
          }

          resolve(
            metadata.streams.find((stream) => stream.codec_type === 'audio') as
              | FfprobeAudioStream
              | undefined,
          );
        });
      },
    );

    const codecName = audioStream?.codec_name;
    const sampleRate = Number(audioStream?.sample_rate);
    const channels = Number(audioStream?.channels);
    const isPcm16Wav = codecName === 'pcm_s16le';
    const is16Khz = sampleRate === 16000;
    const isMono = channels === 1;

    if (!isPcm16Wav || !is16Khz || !isMono) {
      this.logger.error(
        `Audio sau chuẩn hóa không đúng định dạng yêu cầu: codec=${codecName ?? 'N/A'} sample_rate=${audioStream?.sample_rate ?? 'N/A'} channels=${audioStream?.channels ?? 'N/A'} bit_rate=${audioStream?.bit_rate ?? 'N/A'}`,
      );

      throw new UnprocessableEntityException(
        'File audio không thể chuẩn hóa về WAV PCM 16-bit, 16kHz, mono.',
      );
    }

    this.logger.debug(
      `Audio sau chuẩn hóa: codec=${codecName} sample_rate=${sampleRate} channels=${channels} bit_rate=${audioStream?.bit_rate ?? 'N/A'}`,
    );
  }
}
