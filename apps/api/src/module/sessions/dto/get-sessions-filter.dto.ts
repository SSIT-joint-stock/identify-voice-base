import { ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetSessionsFilterDto {
  @ApiPropertyOptional({
    description: 'Trang hiện tại (bắt đầu từ 1)',
    default: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi trên một trang',
    enum: [10, 25, 50],
    default: 10,
  })
  @IsInt()
  @IsEnum([10, 25, 50])
  @IsOptional()
  @Type(() => Number)
  page_size?: number = 10;

  @ApiPropertyOptional({
    description: 'Lọc từ ngày (ISO 8601: 2026-04-01)',
    example: '2026-04-01',
  })
  @IsString()
  @IsOptional()
  from_date?: string;

  @ApiPropertyOptional({
    description: 'Lọc đến ngày (ISO 8601: 2026-04-05)',
    example: '2026-04-05',
  })
  @IsString()
  @IsOptional()
  to_date?: string;
}
