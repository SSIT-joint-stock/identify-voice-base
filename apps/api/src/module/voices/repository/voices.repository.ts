import storageConfig from '@/config/storage.config';
import { PrismaService } from '@/database/prisma/prisma.service';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { UpdateVoiceInfoDto } from '../dto/update-voice-info.dto';
import { VoiceFilterDto } from '../dto/voice-filter.dto';

@Injectable()
export class VoicesRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(storageConfig.KEY)
    private readonly storage: ConfigType<typeof storageConfig>,
  ) {}

  async findActiveVoices(filter: VoiceFilterDto) {
    const {
      page = 1,
      page_size = 10,
      search,
      sort_by = 'name',
      sort_order = 'asc',
    } = filter;

    const where: Prisma.voice_recordsWhereInput = {
      is_active: true,
      ...(search && {
        user: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { citizen_identification: { contains: search } },
            { phone_number: { contains: search } },
            { job: { contains: search, mode: 'insensitive' } },
            { hometown: { contains: search, mode: 'insensitive' } },
            { passport: { contains: search } },
          ],
        },
      }),
    };

    const orderBy: Prisma.voice_recordsOrderByWithRelationInput[] =
      sort_by === 'enrolled_at'
        ? [{ created_at: sort_order }]
        : [{ user: { name: sort_order } }, { created_at: 'desc' }];

    const [items, total] = await Promise.all([
      this.prisma.voice_records.findMany({
        where,
        include: {
          user: true,
          audio_file: true,
        },
        orderBy,
        skip: (page - 1) * page_size,
        take: page_size,
      }),
      this.prisma.voice_records.count({ where }),
    ]);

    const transformedItems = items.map((record) => ({
      id: record.user.id,
      voice_id: record.voice_id,
      name: record.user.name,
      citizen_identification: record.user.citizen_identification,
      passport: record.user.passport,
      hometown: record.user.hometown,
      job: record.user.job,
      criminal_record: record.user.criminal_record,
      phone_number: record.user.phone_number,
      audio_url: `${this.storage.cdnUrl}/${record.audio_file.file_path}`,
      enrolled_at: record.created_at,
    }));

    return {
      items: transformedItems,
      pagination: {
        page,
        page_size,
        total,
        total_pages: Math.ceil(total / page_size),
      },
    };
  }

  /**
   * Lấy chi tiết hồ sơ giọng nói.
   */
  async findDetail(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        voice_record: {
          include: { audio_file: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(
        `Không tìm thấy hồ sơ giọng nói với ID: ${userId}`,
      );
    }

    return user;
  }

  /**
   * Cập nhật thông tin user.
   */
  async updateUserInfo(userId: string, data: UpdateVoiceInfoDto) {
    const user = await this.findDetail(userId);
    return this.prisma.users.update({
      where: { id: user.id },
      data: {
        ...data,
        criminal_record: data.criminal_record as any,
      },
    });
  }

  /**
   * Tìm kiếm lịch sử nhận dạng.
   */
  async findIdentifyHistory(voiceId: string) {
    if (!voiceId) {
      return [];
    }

    const sessions = await this.prisma.identify_sessions.findMany({
      where: {
        results: {
          array_contains: [{ matched_voice_id: voiceId }],
        },
      },
      orderBy: { identified_at: 'desc' },
      take: 5,
    });

    return sessions;
  }

  /**
   * Tìm kiếm thông tin giọng nói kèm theo file audio để phục vụ việc xóa.
   */
  async findVoiceWithFiles(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        voice_record: {
          include: { audio_file: true },
        },
      },
    });

    if (!user) return null;

    return {
      userId: user.id,
      voiceIds: user.voice_record ? [user.voice_record.voice_id] : [],
      audioFileIds: user.voice_record ? [user.voice_record.audio_file_id] : [],
      audioPaths: user.voice_record
        ? [user.voice_record.audio_file.file_path]
        : [],
    };
  }

  /**
   * Vô hiệu hóa hồ sơ giọng nói thay vì xóa cứng.
   */
  async deactivate(userId: string) {
    const user = await this.findDetail(userId);
    if (!user.voice_record) {
      throw new NotFoundException('Người dùng này không có hồ sơ giọng nói');
    }

    return this.prisma.voice_records.update({
      where: { id: user.voice_record.id },
      data: { is_active: false },
    });
  }
}
