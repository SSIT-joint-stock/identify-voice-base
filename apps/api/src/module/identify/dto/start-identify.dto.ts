import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
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
    example: 'https://storage.example.com/identifications/test.wav',
  })
  @IsString()
  @IsNotEmpty()
  audio_url: string;
}
