import { PrismaService } from '@/database/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { VoiceFilterDto } from '../../voices/dto/voice-filter.dto';

@Injectable()
export class AiVoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách voice từ cache AI mà CHƯA được enroll chính thức.
   * Sử dụng logic NOT EXISTS (thông qua query những cache không có voice_records).
   */
  async findNonEnrolled(filter: VoiceFilterDto) {
    const { page = 1, page_size = 10, search } = filter;

    // Lấy danh sách voice_id đã được enroll
    const enrolledVoiceRecords = await this.prisma.voice_records.findMany({
      select: { voice_id: true },
    });
    const enrolledIds = enrolledVoiceRecords.map((v) => v.voice_id);

    const where = {
      voice_id: { notIn: enrolledIds },
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
        where: where as any,
        orderBy: { first_seen_at: 'desc' },
        skip: (page - 1) * page_size,
        take: page_size,
      }),
      this.prisma.ai_identities_cache.count({ where: where as any }),
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

  async findById(voiceId: string) {
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
  async findFirstSampleSession(voiceId: string) {
    return this.prisma.identify_sessions.findFirst({
      where: {
        results: {
          array_contains: [{ matched_voice_id: voiceId }],
        },
      },
      orderBy: { identified_at: 'asc' },
    });
  }
}
