import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SessionType } from '@prisma/client';

export class StartIdentifyDto {
  @ApiProperty({
    enum: SessionType,
    example: SessionType.SINGLE,
  })
  @IsEnum(SessionType)
  @IsNotEmpty()
  session_type: SessionType;

  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  @IsNotEmpty()
  audio_file_id: string;
}
