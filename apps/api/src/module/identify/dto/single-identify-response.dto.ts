import { ApiProperty } from '@nestjs/swagger';
import { SessionType } from '@prisma/client';

export class SingleResultDto {
  @ApiProperty({ example: 1 })
  rank: number;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  voice_id: string;

  @ApiProperty({ example: 0.94 })
  score: number;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  name: string;

  @ApiProperty({ example: '012345678901', nullable: true })
  citizen_identification: string | null;

  @ApiProperty({ example: '0912345678', nullable: true })
  phone_number: string | null;

  @ApiProperty({
    example: [{ case: 'Trộm cắp tài sản', year: 2021 }],
    nullable: true,
  })
  criminal_record: any[] | null;
}

export class SingleIdentifyDataDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  session_id: string;

  @ApiProperty({ example: SessionType.SINGLE })
  session_type: SessionType;

  @ApiProperty({ example: 'http://localhost:3000/uploads/identify/xyz789.wav' })
  audio_url: string;

  @ApiProperty({ example: '2026-04-05T14:30:00.000Z' })
  identified_at: Date;

  @ApiProperty({ type: [SingleResultDto] })
  results: SingleResultDto[];
}
