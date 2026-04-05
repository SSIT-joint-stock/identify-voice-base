import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email mới của người dùng',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 'new_username',
    description: 'Tên đăng nhập mới',
  })
  @IsString({ message: 'Tên đăng nhập phải là chuỗi' })
  @IsOptional()
  username?: string;
}
