import { SearchUtil } from '@/common/helpers/search.util';
import { GENDER_ALIAS_MAP, parseByAliasMap } from '@/common/search-alias';
import storageConfig from '@/config/storage.config';
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
      search_field,
      gender,
      sort_by = 'name',
      sort_order = 'asc',
    } = filter;

    const normalizedSearch = search?.trim();
    const genderFilterProvided = Boolean(gender?.trim());
    const filterGender = this.parseSearchGender(gender);
    const searchAge = this.searchUtil.parseSearchAge(normalizedSearch);
    const searchGender = this.parseSearchGender(normalizedSearch);
    const searchSource = Object.values(UserSource).find(
      (source) => source.toLowerCase() === normalizedSearch?.toLowerCase(),
    );
    const searchFilters = normalizedSearch
      ? this.buildVoiceSearchFilters({
          search: normalizedSearch,
          searchAge,
          searchGender,
          searchSource,
          searchField: search_field,
        })
      : [];

    const where: Prisma.voice_recordsWhereInput = {
      is_active: true,
      ...(filterGender && {
        user: {
          gender: { equals: filterGender },
        },
      }),
      ...(genderFilterProvided &&
        !filterGender && {
          AND: [this.noMatchFilter()],
        }),
      ...(normalizedSearch && {
        OR: searchFilters.length > 0 ? searchFilters : [this.noMatchFilter()],
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

  private buildCriminalRecordSearchFilters(
    search: string,
    searchYear: number | null,
  ): Prisma.usersWhereInput[] {
    const maxCriminalRecordItems = 20;
    const filters: Prisma.usersWhereInput[] = [];

    for (let index = 0; index < maxCriminalRecordItems; index += 1) {
      filters.push({
        criminal_record: {
          path: [String(index), 'case'],
          string_contains: search,
        },
      });

      if (searchYear !== null) {
        filters.push({
          criminal_record: {
            path: [String(index), 'year'],
            equals: searchYear,
          },
        });
      }
    }

    return filters;
  }

  private buildVoiceSearchFilters(params: {
    search: string;
    searchAge: number | null;
    searchGender?: UserGender;
    searchSource?: UserSource;
    searchField?: VoiceFilterDto['search_field'];
  }): Prisma.voice_recordsWhereInput[] {
    const { search, searchAge, searchGender, searchSource, searchField } =
      params;

    if (searchField) {
      return this.buildFieldSearchFilters({
        search,
        searchAge,
        searchGender,
        searchField,
      });
    }

    return [
      { user_name: { contains: search, mode: 'insensitive' } },
      { user_email: { contains: search, mode: 'insensitive' } },
      {
        user: {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              citizen_identification: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              phone_number: {
                contains: search,
                mode: 'insensitive',
              },
            },
            { job: { contains: search, mode: 'insensitive' } },
            {
              hometown: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              passport: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              audio_url: {
                contains: search,
                mode: 'insensitive',
              },
            },
            ...this.buildCriminalRecordSearchFilters(search, searchAge),
            ...(searchAge !== null ? [{ age: { equals: searchAge } }] : []),
            ...(searchGender ? [{ gender: { equals: searchGender } }] : []),
            ...(searchSource ? [{ source: { equals: searchSource } }] : []),
          ],
        },
      },
    ];
  }

  private buildFieldSearchFilters(params: {
    search: string;
    searchAge: number | null;
    searchGender?: UserGender;
    searchField: NonNullable<VoiceFilterDto['search_field']>;
  }): Prisma.voice_recordsWhereInput[] {
    const { search, searchAge, searchGender, searchField } = params;

    switch (searchField) {
      case 'name':
        return [
          { user_name: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
        ];
      case 'hometown':
        return [
          { user: { hometown: { contains: search, mode: 'insensitive' } } },
        ];
      case 'phone_number':
        return [
          { user: { phone_number: { contains: search, mode: 'insensitive' } } },
        ];
      case 'citizen_identification':
        return [
          {
            user: {
              citizen_identification: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ];
      case 'criminal_record':
        return [
          {
            user: {
              OR: this.buildCriminalRecordSearchFilters(search, searchAge),
            },
          },
        ];
      case 'passport':
        return [
          { user: { passport: { contains: search, mode: 'insensitive' } } },
        ];
      case 'age':
        return searchAge !== null
          ? [{ user: { age: { equals: searchAge } } }]
          : [];
      case 'gender':
        return searchGender
          ? [{ user: { gender: { equals: searchGender } } }]
          : [];
      default:
        return [];
    }
  }

  private parseSearchGender(search?: string): UserGender | undefined {
    return parseByAliasMap(
      search,
      (value) => this.normalizeSearchText(value),
      GENDER_ALIAS_MAP,
    );
  }

  private normalizeSearchText(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/đ/g, 'd');
  }

  private noMatchFilter(): Prisma.voice_recordsWhereInput {
    return { voice_id: { equals: '__no_match__' } };
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
