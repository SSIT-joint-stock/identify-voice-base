import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

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

  @ApiPropertyOptional({ type: [CriminalRecordItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriminalRecordItemDto)
  criminal_record?: CriminalRecordItemDto[];
}
