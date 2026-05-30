import {
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { AudioPurpose } from '@prisma/client';
import * as path from 'path';

import storageConfig from '@/config/storage.config';
import { PrismaService } from '@/database/prisma/prisma.service';
import { AiCoreService } from '@/module/ai-core/service/ai-core.service';
import {
  AudioNormalizeService,
  AudioNormalizeTimeoutError,
} from '@/module/ai-core/service/audio-normalize.service';
import { NormalizedIdentifyResponse } from '@/module/ai-core/usecase/ai-identify-single.usecase';
import { SessionsRepository } from '@/module/sessions/repository/sessions.repository';
import { UploadService } from '@/module/upload/service/upload.service';

interface IdentifyS2tResult {
  transcript: string | null;
  detected_language: string | null;
}

@Injectable()
export class IdentifyUseCase {
  private readonly logger = new Logger(IdentifyUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly aiCoreService: AiCoreService,
    private readonly audioNormalizeService: AudioNormalizeService,
    private readonly sessionsRepository: SessionsRepository,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(
    file: Express.Multer.File,
    operatorId: string,
    type: 'SINGLE' | 'MULTI',
  ) {
    this.logger.log(
      `Bắt đầu quy trình Identify bởi operator: ${operatorId} (${type})`,
    );

    // 1. Lưu file audio
    const audioFile = await this.uploadService.uploadOne(
      file,
      AudioPurpose.IDENTIFY,
      operatorId,
    );

    const absolutePath = path.resolve(
      process.cwd(),
      this.config.rootDir,
      audioFile.file_path,
    );

    let aiResponse: NormalizedIdentifyResponse = { speakers: [] };
    let s2tData: IdentifyS2tResult = {
      transcript: null,
      detected_language: null,
    };
    let normalizedAudioPath: string | null = null;

    try {
      let aiAudioPath = absolutePath;
      let aiMimeType = audioFile.mime_type;

      try {
        const normalizedAudio =
          await this.audioNormalizeService.normalizeForAi(absolutePath);
        normalizedAudioPath = normalizedAudio.path;
        aiAudioPath = normalizedAudio.path;
        aiMimeType = normalizedAudio.mimeType;
      } catch (error) {
        if (!(error instanceof AudioNormalizeTimeoutError)) {
          throw error;
        }

        this.logger.warn(
          `Chuẩn hóa audio quá lâu, gửi file gốc sang AI Core: ${audioFile.file_path}`,
        );
      }

      // 2. Gọi AI Identify + S2T song song
      const [identifyResult, s2tResult] = await Promise.allSettled([
        type === 'SINGLE'
          ? this.aiCoreService.identifySingle(aiAudioPath, aiMimeType)
          : this.aiCoreService.identifyMulti(aiAudioPath, aiMimeType),
        this.callSpeechToText(file),
      ]);

      // Identify là bắt buộc
      if (identifyResult.status === 'rejected') {
        throw identifyResult.reason;
      }
      aiResponse = identifyResult.value;

      // S2T là optional (non-blocking)
      if (s2tResult.status === 'fulfilled' && s2tResult.value) {
        const transcript = this.extractTranscript(s2tResult.value);
        let detectedLanguage: string | null = null;

        if (transcript) {
          try {
            const langResult = await this.aiCoreService.detectLanguage({
              text: transcript,
            });
            detectedLanguage = this.extractDetectedLanguage(langResult);
          } catch (langError) {
            this.logger.warn(
              `Detect language thất bại: ${langError instanceof Error ? langError.message : langError}`,
            );
          }
        }

        s2tData = { transcript, detected_language: detectedLanguage };
      } else if (s2tResult.status === 'rejected') {
        this.logger.warn(
          `S2T thất bại (non-blocking): ${s2tResult.reason?.message ?? s2tResult.reason}`,
        );
      }

      // 3. Upsert vào ai_identities_cache metadata từ AI thay vì dính líu đến users
      if (aiResponse.speakers.length > 0) {
        // Caching chỉ lưu khi AI có trả về voice_id
        const validSpeakers = aiResponse.speakers.filter(
          (s) => !!s.matched_voice_id,
        );

        await Promise.all(
          validSpeakers.map((s) => {
            return this.prisma.ai_identities_cache.upsert({
              where: { voice_id: s.matched_voice_id! },
              create: {
                voice_id: s.matched_voice_id!,
                name: s.name,
                citizen_identification: s.citizen_identification,
                phone_number: s.phone_number,
                hometown: s.hometown,
                job: s.job,
                passport: s.passport,
                criminal_record: s.criminal_record ?? undefined,
                raw: s.raw_ai_data ?? {},
              },
              update: {
                name: s.name,
                citizen_identification: s.citizen_identification,
                phone_number: s.phone_number,
                hometown: s.hometown,
                job: s.job,
                passport: s.passport,
                criminal_record: s.criminal_record ?? undefined,
                raw: s.raw_ai_data ?? {},
              },
            });
          }),
        );
      }
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        throw error;
      }
      this.logger.error(`Lỗi Nhận diện âm thanh: ${error.message}`);
      throw error;
    } finally {
      await this.audioNormalizeService.cleanup(normalizedAudioPath);
    }

    // 4. Lưu session thông qua SessionsRepository (kết quả identify + S2T)
    const session = await this.sessionsRepository.create({
      user_id: operatorId,
      audio_file_id: audioFile.id,
      results: {
        speakers: aiResponse.speakers,
        transcript: s2tData.transcript,
        detected_language: s2tData.detected_language,
      } as any,
      transcript: s2tData.transcript,
      detected_language: s2tData.detected_language,
    });

    // 5. Trả về kết quả — metadata Business Truth từ users khi đã định danh & còn active
    const enrichedSpeakers = await Promise.all(
      aiResponse.speakers.map(async (s) => {
        const base = {
          speaker_label: s.speaker_label,
          matched_voice_id: s.matched_voice_id,
          score: s.score,
          name: s.name,
          citizen_identification: s.citizen_identification,
          phone_number: s.phone_number,
          segments: s.segments,
        };

        let row: Record<string, unknown> = { ...base };

        if (s.matched_voice_id) {
          const voiceRecord = await this.prisma.voice_records.findFirst({
            where: {
              voice_id: s.matched_voice_id,
              is_active: true,
            },
            include: { user: true },
            orderBy: { created_at: 'desc' },
          });
          if (voiceRecord?.is_active && voiceRecord.user) {
            const u = voiceRecord.user;
            row = {
              ...row,
              user_id: u.id,
              name: u.name,
              citizen_identification: u.citizen_identification,
              phone_number: u.phone_number,
              hometown: u.hometown,
              job: u.job,
              passport: u.passport,
              age: u.age,
              gender: u.gender,
              criminal_record: u.criminal_record,
              enroll_audio_url: u.audio_url ?? undefined,
            };
          }
        }

        if (type === 'MULTI' && s.segments && s.segments.length > 0) {
          row.audio_url = `${this.config.cdnUrl.replace('/cdn', '/api/v1')}/sessions/${session.id}/speakers/${s.speaker_label}/audio`;
        }

        return row;
      }),
    );

    return {
      session_id: session.id,
      audio_url: `${this.config.cdnUrl}/${audioFile.file_path}`,
      identified_at: session.identified_at,
      type,
      speakers: enrichedSpeakers,
      transcript: s2tData.transcript,
      detected_language: s2tData.detected_language,
    };
  }

  /**
   * Gọi S2T API với file upload gốc (auto-detect language, không timestamp, không denoise)
   */
  private async callSpeechToText(file: Express.Multer.File) {
    return this.aiCoreService.speechToText(file, {
      return_timestamp: false,
      denoise_audio: false,
    });
  }

  /**
   * Trích xuất transcript string từ S2T response
   */
  private extractTranscript(s2tResult: unknown): string | null {
    if (!s2tResult || typeof s2tResult !== 'object') return null;

    const result = s2tResult as Record<string, unknown>;
    const transcript = result.transcript;

    if (typeof transcript === 'string') {
      return transcript.trim() || null;
    }

    // Nếu transcript là array segments → ghép thành string
    if (Array.isArray(transcript)) {
      const text = transcript
        .map((seg) =>
          typeof seg === 'object' && seg !== null
            ? (seg as Record<string, unknown>).text
            : '',
        )
        .filter(Boolean)
        .join(' ');
      return text.trim() || null;
    }

    return null;
  }

  /**
   * Trích xuất detected language từ detect language response
   */
  private extractDetectedLanguage(langResult: unknown): string | null {
    if (!langResult || typeof langResult !== 'object') return null;

    const result = langResult as Record<string, unknown>;
    const languages = result.detected_languages;

    if (typeof languages === 'string') return languages;
    if (Array.isArray(languages) && languages.length > 0) {
      return typeof languages[0] === 'string' ? languages[0] : null;
    }

    return null;
  }
}
