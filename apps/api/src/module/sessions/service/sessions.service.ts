import { PrismaService } from '@/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { SessionsRepository } from '../repository/sessions.repository';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async getSessionDetail(id: string) {
    const session = await this.sessionsRepository.findOne(id);

    // The results is stored as an array of NormalizedSpeakerResult
    // SessionRepository returns it under session.results
    const speakers = (session.results as any[]) || [];

    const enrichedSpeakers = await Promise.all(
      speakers.map(async (speaker) => {
        if (!speaker.matched_voice_id) {
          // Unidentified speaker
          return {
            speaker_label: speaker.speaker_label,
            matched_voice_id: null,
            score: speaker.score,
            name: 'Unknown',
            citizen_identification: null,
            phone_number: null,
            hometown: null,
            job: null,
            passport: null,
            criminal_record: null,
            segments: speaker.segments,
            truth_source: 'NONE',
          };
        }

        const voiceId = speaker.matched_voice_id;

        // 1. Business Truth (users via voice_records)
        const voiceRecord = await this.prisma.voice_records.findFirst({
          where: {
            voice_id: voiceId,
            is_active: true,
          },
          include: {
            user: true,
          },
        });

        if (voiceRecord && voiceRecord.user) {
          return {
            speaker_label: speaker.speaker_label,
            matched_voice_id: voiceId,
            score: speaker.score,
            name: voiceRecord.user.name,
            citizen_identification: voiceRecord.user.citizen_identification,
            phone_number: voiceRecord.user.phone_number,
            hometown: voiceRecord.user.hometown,
            job: voiceRecord.user.job,
            passport: voiceRecord.user.passport,
            criminal_record: voiceRecord.user.criminal_record,
            segments: speaker.segments,
            truth_source: 'BUSINESS',
          };
        }

        // 2. AI Truth (ai_identities_cache)
        const aiCache = await this.prisma.ai_identities_cache.findUnique({
          where: { voice_id: voiceId },
        });

        if (aiCache) {
          return {
            speaker_label: speaker.speaker_label,
            matched_voice_id: voiceId,
            score: speaker.score,
            name: aiCache.name ?? 'Unknown',
            citizen_identification: aiCache.citizen_identification,
            phone_number: aiCache.phone_number,
            hometown: aiCache.hometown,
            job: aiCache.job,
            passport: aiCache.passport,
            criminal_record: aiCache.criminal_record,
            segments: speaker.segments,
            truth_source: 'AI',
          };
        }

        // 3. Not found anywhere
        return {
          speaker_label: speaker.speaker_label,
          matched_voice_id: voiceId,
          score: speaker.score,
          name: 'Unknown',
          citizen_identification: null,
          phone_number: null,
          hometown: null,
          job: null,
          passport: null,
          criminal_record: null,
          segments: speaker.segments,
          truth_source: 'NONE',
        };
      }),
    );

    return {
      id: session.id,
      audio_url: session.audio_url,
      identified_at: session.identified_at,
      operator: session.operator,
      speakers: enrichedSpeakers,
    };
  }
}
