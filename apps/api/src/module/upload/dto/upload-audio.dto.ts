import { ApiProperty } from '@nestjs/swagger';
import { AudioPurpose } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UploadAudioDto {
  @ApiProperty({
    enum: AudioPurpose,
    description: 'Mục đích upload: ENROLL | IDENTIFY | UPDATE_VOICE',
    example: 'ENROLL',
  })
  @IsNotEmpty({ message: 'purpose không được để trống' })
  @IsEnum(AudioPurpose, {
    message:
      'purpose không hợp lệ. Giá trị hợp lệ: ENROLL, IDENTIFY, UPDATE_VOICE',
  })
  purpose: AudioPurpose;
}
