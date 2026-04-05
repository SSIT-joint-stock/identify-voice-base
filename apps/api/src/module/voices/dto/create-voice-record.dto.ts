import { IsString, IsNotEmpty, IsOptional, IsJSON, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVoiceRecordDto {
  @ApiProperty({ example: 'Thanh Trh' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '123456789012' })
  @IsString()
  @IsNotEmpty()
  cccd: string;

  @ApiProperty({ example: '0123456789' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'https://storage.example.com/voices/voice1.wav' })
  @IsString()
  @IsNotEmpty()
  audio_url: string;

  @ApiProperty({ example: { age: 25, gender: 'male' }, required: false })
  @IsObject()
  @IsOptional()
  metadata?: any;
}
