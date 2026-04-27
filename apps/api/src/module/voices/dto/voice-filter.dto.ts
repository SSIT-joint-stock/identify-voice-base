import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const VOICE_SEARCH_FIELDS = [
  'name',
  'hometown',
  'phone_number',
  'citizen_identification',
  'criminal_record',
  'passport',
  'age',
  'gender',
] as const;

export type VoiceSearchField = (typeof VOICE_SEARCH_FIELDS)[number];

export class VoiceFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page_size?: number = 10;

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo name, CCCD, SDT, tuổi, giới tính, ...',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: VOICE_SEARCH_FIELDS,
    description: 'Giới hạn tìm kiếm theo một trường cụ thể',
  })
  @IsOptional()
  @IsIn(VOICE_SEARCH_FIELDS)
  search_field?: VoiceSearchField;

  @ApiPropertyOptional({
    enum: ['MALE', 'FEMALE', 'OTHER'],
    description:
      'Lọc hồ sơ theo giới tính. Không phân biệt hoa thường, ví dụ: ?gender=FEMALE hoặc ?gender=female',
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({
    enum: ['name', 'enrolled_at'],
    default: 'name',
    description: 'Trường dùng để sắp xếp',
  })
  @IsOptional()
  @IsIn(['name', 'enrolled_at'])
  sort_by?: 'name' | 'enrolled_at' = 'name';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'asc',
    description: 'Chiều sắp xếp',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc' = 'asc';
}
