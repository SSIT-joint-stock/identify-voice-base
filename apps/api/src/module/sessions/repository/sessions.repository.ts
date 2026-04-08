import storageConfig from '@/config/storage.config';
import { PrismaService } from '@/database/prisma/prisma.service';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { GetSessionsFilterDto } from '../dto/get-sessions-filter.dto';

@Injectable()
export class SessionsRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(storageConfig.KEY)
    private readonly storage: ConfigType<typeof storageConfig>,
  ) {}

  /**
   * Tạo một phiên nhận dạng mới.
   */
  async create(data: Prisma.identify_sessionsUncheckedCreateInput) {
    return this.prisma.identify_sessions.create({
      data,
    });
  }

  /**
   * Lấy danh sách các phiên nhận dạng với phân trang và bộ lọc.
   */
  async findAll(filter: GetSessionsFilterDto) {
    const page = filter.page ?? 1;
    const page_size = filter.page_size ?? 10;
    const { from_date, to_date } = filter;

    const where: Prisma.identify_sessionsWhereInput = {
      ...((from_date || to_date) && {
        identified_at: {
          ...(from_date && { gte: new Date(from_date) }),
          ...(to_date && { lte: new Date(to_date) }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.identify_sessions.findMany({
        where,
        include: {
          operator: { select: { id: true, username: true } },
          audio_file: { select: { file_path: true } },
        },
        orderBy: { identified_at: 'desc' },
        skip: (page - 1) * page_size,
        take: page_size,
      }),
      this.prisma.identify_sessions.count({ where }),
    ]);

    const enrichedItems = items.map((session) => {
      const results = (session.results as any[]) || [];
      let topScore: number | null = null;

      const scores = results
        .map((s) => s.score)
        .filter((s): s is number => typeof s === 'number');
      if (scores.length > 0) {
        topScore = Math.max(...scores);
      }

      return {
        id: session.id,
        audio_url: `${this.storage.cdnUrl}/${session.audio_file.file_path}`,
        identified_at: session.identified_at,
        operator: session.operator,
        result_count: results.length,
        top_score: topScore,
      };
    });

    return {
      items: enrichedItems,
      pagination: {
        page,
        page_size,
        total,
        total_pages: Math.ceil(total / page_size),
      },
    };
  }

  /**
   * Lấy chi tiết một phiên nhận dạng.
   */
  async findOne(id: string) {
    const session = await this.prisma.identify_sessions.findUnique({
      where: { id },
      include: {
        operator: { select: { id: true, username: true } },
        audio_file: { select: { file_path: true } },
      },
    });

    if (!session) {
      throw new NotFoundException(
        `Không tìm thấy phiên nhận dạng với ID: ${id}`,
      );
    }

    return {
      id: session.id,
      audio_url: `${this.storage.cdnUrl}/${session.audio_file.file_path}`,
      identified_at: session.identified_at,
      operator: session.operator,
      results: session.results,
    };
  }
}
