import { SegmentUtil } from '@/common/helpers/segment.util';
import storageConfig from '@/config/storage.config';
import { PrismaService } from '@/database/prisma/prisma.service';
import { AudioSegmentService } from '@/module/ai-core/service/audio-segment.service';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audioSegmentService: AudioSegmentService,
    private readonly segmentUtil: SegmentUtil,
    @Inject(storageConfig.KEY)
    private readonly storageCfg: ConfigType<typeof storageConfig>,
  ) {}

  /**
   * Lấy chi tiết phiên nhận dạng và làm giàu thông tin (Enrichment).
   */
  async getSessionDetail(id: string) {
    // 1. Lấy session raw từ repo (chứa results JSON và audio_file metadata)
    const session = await this.prisma.identify_sessions.findUnique({
      where: { id },
      include: {
        operator: { select: { id: true, username: true } },
        audio_file: { select: { file_path: true } },
      },
    });

    if (!session) {
      throw new NotFoundException(`Không tìm thấy phiên nhận dạng: ${id}`);
    }

    const speakers = (session.results as any[]) || [];

    // 2. Làm giàu thông tin từng speaker
    const enrichedSpeakers = await Promise.all(
      speakers.map(async (speaker) => {
        const segments = this.segmentUtil.extractSegments(speaker);

        const baseResult = {
          speaker_label: speaker.speaker_label,
          matched_voice_id: speaker.matched_voice_id || null,
          score: speaker.score,
          segments,
          // Mặc định cho Multi-voice: URL dẫn tới API streaming
          audio_url:
            segments.length > 0
              ? `${this.storageCfg.cdnUrl.replace('/cdn', '/api/v1')}/sessions/${session.id}/speakers/${speaker.speaker_label}/audio`
              : null,
        };

        if (!speaker.matched_voice_id) {
          return {
            ...baseResult,
            name: 'Unknown',
            truth_source: 'NONE',
          };
        }

        const voiceId = speaker.matched_voice_id;

        // Ưu tiên Business Truth (người dùng thật trong hệ thống)
        const voiceRecord = await this.prisma.voice_records.findUnique({
          where: { voice_id: voiceId },
          include: { user: true },
        });

        if (voiceRecord && voiceRecord.user) {
          return {
            ...baseResult,
            name: voiceRecord.user.name,
            citizen_identification: voiceRecord.user.citizen_identification,
            phone_number: voiceRecord.user.phone_number,
            hometown: voiceRecord.user.hometown,
            job: voiceRecord.user.job,
            passport: voiceRecord.user.passport,
            criminal_record: voiceRecord.user.criminal_record,
            // Single-voice: Trả về audio mẫu để so sánh
            enroll_audio_url: voiceRecord.user.audio_url,
            truth_source: 'BUSINESS',
          };
        }

        // Sau đó mới đến AI Truth (danh tính cache từ AI)
        const aiCache = await this.prisma.ai_identities_cache.findUnique({
          where: { voice_id: voiceId },
        });

        if (aiCache) {
          return {
            ...baseResult,
            name: aiCache.name ?? 'Unknown',
            citizen_identification: aiCache.citizen_identification,
            phone_number: aiCache.phone_number,
            hometown: aiCache.hometown,
            job: aiCache.job,
            passport: aiCache.passport,
            criminal_record: aiCache.criminal_record,
            truth_source: 'AI',
          };
        }

        return {
          ...baseResult,
          name: 'Unknown',
          truth_source: 'NONE',
        };
      }),
    );

    return {
      id: session.id,
      audio_url: `${this.storageCfg.cdnUrl}/${session.audio_file.file_path}`,
      identified_at: session.identified_at,
      operator: session.operator,
      speakers: enrichedSpeakers,
    };
  }

  /**
   * Stream audio của một speaker cụ thể (On-demand merging).
   */
  async streamSpeakerAudio(
    sessionId: string,
    speakerLabel: string,
    res: Response,
  ) {
    const session = await this.prisma.identify_sessions.findUnique({
      where: { id: sessionId },
      include: { audio_file: true },
    });

    if (!session) {
      throw new NotFoundException('Session không tồn tại');
    }

    const results = (session.results as any[]) || [];
    const speakerData = results.find((s) => s.speaker_label === speakerLabel);
    const segments = this.segmentUtil.extractSegments(speakerData);

    if (!speakerData || segments.length === 0) {
      throw new NotFoundException(
        `Không tìm thấy dữ liệu âm thanh cho speaker: ${speakerLabel}`,
      );
    }

    const originalFilePath = path.resolve(
      process.cwd(),
      this.storageCfg.rootDir,
      session.audio_file.file_path,
    );

    if (!fs.existsSync(originalFilePath)) {
      throw new NotFoundException('File audio gốc không tồn tại trên hệ thống');
    }

    try {
      const tempFilePath = await this.audioSegmentService.buildSpeakerAudio(
        originalFilePath,
        segments,
      );

      // 2. Stream về client và xóa file sau khi xong
      res.sendFile(tempFilePath, (err) => {
        if (err) {
          this.logger.error(`Lỗi khi gửi file stream: ${err.message}`);
        }
        // Xóa file tạm
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      });
    } catch (error) {
      this.logger.error(`Lỗi xử lý on-demand audio: ${error.message}`);
      res.status(500).json({ message: 'Lỗi xử lý âm thanh' });
    }
  }
}
