import { Match } from '@/common/decorators';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'old_password123' })
  @IsString()
  @IsNotEmpty({
    message: 'Mật khẩu cũ không được để trống',
  })
  old_password: string;

  @ApiProperty({ example: 'new_password456' })
  @IsString()
  @IsNotEmpty({
    message: 'Mật khẩu mới không được để trống',
  })
  @MinLength(6, {
    message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
  })
  new_password: string;

  @ApiProperty({ example: 'new_password456' })
  @IsString()
  @IsNotEmpty({
    message: 'Mật khẩu xác nhận không được để trống',
  })
  @Match('new_password', {
    message: 'Mật khẩu mới không khớp với mật khẩu xác nhận',
  })
  confirm_new_password: string;
}
