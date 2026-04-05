import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum IdentifySessionType {
  SINGLE = 'single',
  MULTI = 'multi',
}

export class StartIdentifyDto {
  @ApiProperty({ enum: IdentifySessionType, example: IdentifySessionType.SINGLE })
  @IsEnum(IdentifySessionType)
  @IsNotEmpty()
  session_type: IdentifySessionType;

  @ApiProperty({ example: 'https://storage.example.com/identifications/test.wav' })
  @IsString()
  @IsNotEmpty()
  audio_url: string;
}
