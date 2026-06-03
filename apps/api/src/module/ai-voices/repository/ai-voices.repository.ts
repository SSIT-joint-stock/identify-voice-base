import { PrismaService } from '@/database/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { auth_accounts, Prisma, Role } from '@prisma/client';
import { VoiceFilterDto } from '../../voices/dto/voice-filter.dto';

@Injectable()
export class AiVoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách voice từ cache AI mà CHƯA được enroll chính thức.
   * Sử dụng logic NOT EXISTS (thông qua query những cache không có voice_records).
   */
  async findNonEnrolled(filter: VoiceFilterDto, requester?: auth_accounts) {
    const { page = 1, page_size = 10, search } = filter;

    // Lấy danh sách voice_id đã được enroll
    const enrolledVoiceRecords = await this.prisma.voice_records.findMany({
      select: { voice_id: true },
    });
    const enrolledIds = enrolledVoiceRecords.map((v) => v.voice_id);
    const visibleVoiceIds = await this.findVisibleAiVoiceIds(requester);

    const where: Prisma.ai_identities_cacheWhereInput = {
      voice_id: {
        notIn: enrolledIds,
        ...(visibleVoiceIds && { in: visibleVoiceIds }),
      },
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { citizen_identification: { contains: search } },
          { phone_number: { contains: search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.ai_identities_cache.findMany({
        where,
        orderBy: { first_seen_at: 'desc' },
        skip: (page - 1) * page_size,
        take: page_size,
      }),
      this.prisma.ai_identities_cache.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        page_size,
        total,
        total_pages: Math.ceil(total / page_size),
      },
    };
  }

  async findById(voiceId: string, requester?: auth_accounts) {
    await this.assertVisibleToRequester(voiceId, requester);

    const cache = await this.prisma.ai_identities_cache.findUnique({
      where: { voice_id: voiceId },
    });

    if (!cache) {
      throw new NotFoundException(`Không tìm thấy AI Voice với ID: ${voiceId}`);
    }

    return cache;
  }

  /**
   * Tìm mẫu nhận dạng đầu tiên của voice_id này để lấy sample audio.
   */
  async findFirstSampleSession(voiceId: string, requester?: auth_accounts) {
    return this.prisma.identify_sessions.findFirst({
      where: {
        ...(requester &&
          requester.role !== Role.ADMIN && { user_id: requester.id }),
        results: {
          array_contains: [{ matched_voice_id: voiceId }],
        },
      },
      orderBy: { identified_at: 'asc' },
    });
  }

  private async assertVisibleToRequester(
    voiceId: string,
    requester?: auth_accounts,
  ) {
    if (!requester || requester.role === Role.ADMIN) {
      return;
    }

    const sampleSession = await this.findFirstSampleSession(voiceId, requester);
    if (!sampleSession) {
      throw new NotFoundException(`Không tìm thấy AI Voice với ID: ${voiceId}`);
    }
  }

  private async findVisibleAiVoiceIds(requester?: auth_accounts) {
    if (!requester || requester.role === Role.ADMIN) {
      return null;
    }

    const sessions = await this.prisma.identify_sessions.findMany({
      where: { user_id: requester.id },
      select: { results: true },
    });

    const voiceIds = new Set<string>();
    sessions.forEach((session) => {
      this.extractMatchedVoiceIds(session.results).forEach((voiceId) =>
        voiceIds.add(voiceId),
      );
    });

    return [...voiceIds];
  }

  private extractMatchedVoiceIds(results: Prisma.JsonValue) {
    const speakers = Array.isArray(results)
      ? results
      : this.isJsonObjectWithSpeakers(results)
        ? results.speakers
        : [];

    return speakers
      .map((speaker) =>
        this.isJsonObject(speaker) ? speaker.matched_voice_id : null,
      )
      .filter((voiceId): voiceId is string => typeof voiceId === 'string');
  }

  private isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private isJsonObjectWithSpeakers(
    value: Prisma.JsonValue,
  ): value is Prisma.JsonObject & { speakers: Prisma.JsonArray } {
    return this.isJsonObject(value) && Array.isArray(value.speakers);
  }
}
