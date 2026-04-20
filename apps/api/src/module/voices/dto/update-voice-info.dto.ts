import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserGender } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CriminalRecordItemDto {
  @IsString()
  @IsNotEmpty()
  case: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;
}

export class UpdateVoiceInfoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  citizen_identification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10,11}$/)
  phone_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hometown?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  job?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passport?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Tuổi phải lớn hơn 0' })
  age?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(UserGender, {
    message: 'Vui lòng chọn đúng giới tính: Nam, Nữ, Khác',
  })
  gender?: UserGender;

  @ApiPropertyOptional({ type: [CriminalRecordItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriminalRecordItemDto)
  criminal_record?: CriminalRecordItemDto[];
}
