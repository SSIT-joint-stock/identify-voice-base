import { ApiProperty } from '@nestjs/swagger';
import { SessionType } from '@prisma/client';

export class VoiceSegmentDto {
  @ApiProperty({ example: 0.5 })
  start: number;

  @ApiProperty({ example: 4.2 })
  end: number;
}

export class SpeakerResultDto {
  @ApiProperty({ example: 'SPEAKER_00' })
  speaker_label: string;

  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    nullable: true,
  })
  voice_id: string | null;

  @ApiProperty({ example: 0.91, nullable: true })
  score: number | null;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  name: string;

  @ApiProperty({ example: '012345678901', nullable: true })
  citizen_identification: string | null;

  @ApiProperty({ example: '0912345678', nullable: true })
  phone_number: string | null;

  @ApiProperty({
    example: [],
    nullable: true,
  })
  criminal_record: any[] | null;

  @ApiProperty({ type: [VoiceSegmentDto] })
  segments: VoiceSegmentDto[];
}

export class MultiIdentifyDataDto {
  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  session_id: string;

  @ApiProperty({ example: SessionType.MULTI })
  session_type: SessionType;

  @ApiProperty({
    example: 'http://localhost:3000/uploads/identify/conv456.wav',
  })
  audio_url: string;

  @ApiProperty({ example: '2026-04-05T15:00:00.000Z' })
  identified_at: Date;

  @ApiProperty({ type: [SpeakerResultDto] })
  speakers: SpeakerResultDto[];
}
