import { ALL_PERMISSIONS, type AppPermission } from '@/common/auth/permissions';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ example: 'operator@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiPropertyOptional({ example: 'operator01' })
  @IsOptional()
  @IsString({ message: 'Tên đăng nhập phải là chuỗi' })
  username?: string;

  @ApiProperty({ example: 'password123' })
  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.OPERATOR })
  @IsOptional()
  @IsEnum(Role, { message: 'Role không hợp lệ' })
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Trạng thái không hợp lệ' })
  status?: UserStatus;

  @ApiPropertyOptional({
    isArray: true,
    enum: ALL_PERMISSIONS,
    description:
      'Danh sách quyền cho operator. Nếu bỏ trống, operator mặc định có full quyền như admin.',
  })
  @IsOptional()
  @IsArray({ message: 'permissions phải là mảng' })
  @ArrayUnique({ message: 'permissions không được trùng lặp' })
  @IsEnum(ALL_PERMISSIONS, {
    each: true,
    message: 'permissions chứa giá trị không hợp lệ',
  })
  permissions?: AppPermission[];
}
