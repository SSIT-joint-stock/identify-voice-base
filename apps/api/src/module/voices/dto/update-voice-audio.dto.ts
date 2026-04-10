import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class UpdateVoiceAudioDto {
  @ApiProperty({
    description:
      'Mảng các ID của audio_file đã được ghi nhận trong Identify Sessions',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Cần ít nhất 1 audio file' })
  @ArrayMaxSize(20, { message: 'Tối đa 20 audio files 1 lúc' })
  @IsUUID('4', { each: true, message: 'ID audio file phải là UUID hợp lệ' })
  audioIds: string[];
}
