import storageConfig from '@/config/storage.config';
import { SearchUtil } from '@/common/helpers/search.util';
import { PrismaService } from '@/database/prisma/prisma.service';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Prisma, UserGender, UserSource } from '@prisma/client';
import { UpdateVoiceInfoDto } from '../dto/update-voice-info.dto';
import { VoiceFilterDto } from '../dto/voice-filter.dto';

@Injectable()
export class VoicesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchUtil: SearchUtil,
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

    const normalizedSearch = search?.trim();
    const searchAge = this.searchUtil.parseSearchAge(normalizedSearch);
    const searchGender = Object.values(UserGender).find(
      (gender) => gender.toLowerCase() === normalizedSearch?.toLowerCase(),
    );
    const searchSource = Object.values(UserSource).find(
      (source) => source.toLowerCase() === normalizedSearch?.toLowerCase(),
    );
    const searchDateRange =
      this.searchUtil.parseSearchDateRange(normalizedSearch);
    const searchUuid = this.searchUtil.isUuid(normalizedSearch)
      ? normalizedSearch
      : null;

    const where: Prisma.voice_recordsWhereInput = {
      is_active: true,
      ...(normalizedSearch && {
        OR: [
          { voice_id: { contains: normalizedSearch, mode: 'insensitive' } },
          { user_name: { contains: normalizedSearch, mode: 'insensitive' } },
          { user_email: { contains: normalizedSearch, mode: 'insensitive' } },
          ...(searchUuid
            ? [
                { id: { equals: searchUuid } },
                { user_id: { equals: searchUuid } },
                { audio_file_id: { equals: searchUuid } },
              ]
            : []),
          ...(searchDateRange ? [{ created_at: searchDateRange }] : []),
          {
            audio_file: {
              OR: [
                {
                  file_name: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  file_path: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  mime_type: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
          {
            user: {
              OR: [
                ...(searchUuid ? [{ id: { equals: searchUuid } }] : []),
                {
                  name: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  citizen_identification: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  phone_number: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                { job: { contains: normalizedSearch, mode: 'insensitive' } },
                {
                  hometown: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  passport: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  audio_url: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                ...(searchAge !== null ? [{ age: { equals: searchAge } }] : []),
                ...(searchGender ? [{ gender: { equals: searchGender } }] : []),
                ...(searchSource ? [{ source: { equals: searchSource } }] : []),
              ],
            },
          },
        ],
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
      age: record.user.age,
      gender: record.user.gender,
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
        voice_records: {
          include: { audio_file: true },
          orderBy: { created_at: 'desc' },
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
        voice_records: {
          include: { audio_file: true },
          where: { is_active: true },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!user) return null;

    const activeRecord = user.voice_records[0];

    return {
      userId: user.id,
      voiceIds: activeRecord ? [activeRecord.voice_id] : [],
      audioFileIds: activeRecord ? [activeRecord.audio_file_id] : [],
      audioPaths: activeRecord ? [activeRecord.audio_file.file_path] : [],
    };
  }

  /**
   * Vô hiệu hóa hồ sơ giọng nói thay vì xóa cứng.
   */
  async deactivate(userId: string) {
    const user = await this.findDetail(userId);
    const activeRecord = user.voice_records.find((record) => record.is_active);

    if (!activeRecord) {
      throw new NotFoundException('Người dùng này không có hồ sơ giọng nói');
    }

    return this.prisma.voice_records.update({
      where: { id: activeRecord.id },
      data: { is_active: false },
    });
  }
}
