import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'old_password123' })
  @IsString()
  @IsNotEmpty()
  old_password: string;

  @ApiProperty({ example: 'new_password456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  new_password: string;
}
