import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export type IdentifyTopKRecords = number;

export class IdentifyRequestDto {
  @ApiPropertyOptional({
    enum: ['SINGLE', 'MULTI'],
    default: 'MULTI',
    description: 'Loại nhận dạng (1 người hoặc 2 người)',
  })
  @IsIn(['SINGLE', 'MULTI'])
  @IsOptional()
  type: 'SINGLE' | 'MULTI' = 'MULTI';

  @ApiPropertyOptional({
    default: 5,
    minimum: 1,
    description:
      'Số kết quả gần giống tối đa cho chế độ SINGLE (số nguyên dương)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  top_k_records: IdentifyTopKRecords = 5;
}
