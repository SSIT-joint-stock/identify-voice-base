import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserGender } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsJSON,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class EnrollVoiceDto {
  @ApiProperty({
    description: 'Họ tên đầy đủ của người được đăng ký',
    example: 'Nguyễn Veăn A',
    maxLength: 100,
  })
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên không được để trống' })
  @MaxLength(100, { message: 'Tên tối đa 100 ký tự' })
  name: string;

  @ApiPropertyOptional({
    description: 'Số CCCD / CMND (9-12 chữ số)',
    example: '012345678901',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Số CCCD tối đa 20 ký tự' })
  citizen_identification?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại (10-11 chữ số)',
    example: '0912345678',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{10,11}$/, {
    message: 'Số điện thoại không hợp lệ (10-11 số)',
  })
  phone_number?: string;

  @ApiPropertyOptional({
    description: 'Quê quán',
    example: 'Hà Nội',
  })
  @IsString()
  @IsOptional()
  hometown?: string;

  @ApiPropertyOptional({
    description: 'Nghề nghiệp',
    example: 'Kỹ sư phần mềm',
  })
  @IsString()
  @IsOptional()
  job?: string;

  @ApiPropertyOptional({
    description: 'Số hộ chiếu',
    example: 'B1234567',
  })
  @IsString()
  @IsOptional()
  passport?: string;

  @ApiPropertyOptional({
    description: 'Tuổi',
    example: 30,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0, {
    message: 'Vui lòng nhập tuổi số lớn hơn 0',
  })
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({
    description: 'Giới tính',
    enum: UserGender,
    example: UserGender.MALE,
  })
  @IsOptional()
  @IsEnum(UserGender, {
    message: 'Vui lòng chọn đúng giới tính: Nam, Nữ, Khác',
  })
  gender?: UserGender;

  @ApiPropertyOptional({
    description: 'Tiền án tiền sự (JSON string)',
    example: '[{"case":"Trộm cắp tài sản","year":2021}]',
  })
  @IsJSON({ message: 'criminal_record phải là JSON string hợp lệ' })
  @IsOptional()
  criminal_record?: string;
}
