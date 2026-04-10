// cspell:ignore atrim
import { Injectable, Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AudioSegmentService {
  private readonly logger = new Logger(AudioSegmentService.name);

  /**
   * Tạo một file audio mới từ các phân đoạn (segments) của file gốc.
   * Sử dụng ffmpeg filter_complex để trích xuất và nối các đoạn lại với nhau.
   */
  async buildSpeakerAudio(
    originalAudioPath: string,
    segments: { start: number; end: number }[],
  ): Promise<string> {
    if (!segments || segments.length === 0) {
      throw new Error('Cần cung cấp ít nhất một đoạn (segments) để gộp.');
    }

    // Đảm bảo outputPath nằm trong thư mục tạm
    const outputPath = path.join('/tmp', `speaker_${uuidv4()}.wav`);

    return new Promise((resolve, reject) => {
      const command = ffmpeg(originalAudioPath);

      const filterDescs: string[] = [];
      const outputLabels: string[] = [];

      segments.forEach((seg, index) => {
        const label = `a${index}`;
        filterDescs.push(
          `[0:a]atrim=start=${seg.start}:end=${seg.end},asetpts=PTS-STARTPTS[${label}]`,
        );
        outputLabels.push(`[${label}]`);
      });

      // Lệnh nối (concat)
      filterDescs.push(
        `${outputLabels.join('')}concat=n=${segments.length}:v=0:a=1[out]`,
      );

      command
        .complexFilter(filterDescs)
        .map('[out]')
        .on('start', (cmdLine) => {
          this.logger.debug(`Bắt đầu FFmpeg: ${cmdLine}`);
        })
        .on('error', (err: Error) => {
          this.logger.error(`Lỗi FFmpeg: ${err.message}`);
          reject(new Error(err.message));
        })
        .on('end', () => {
          this.logger.log(`Hoàn thành gộp audio: ${outputPath}`);
          resolve(outputPath);
        })
        .save(outputPath);
    });
  }
}
