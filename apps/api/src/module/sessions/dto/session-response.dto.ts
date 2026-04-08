import { ApiProperty } from '@nestjs/swagger';
import { SessionType } from '@prisma/client';

export class SessionOperatorDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'admin' })
  username: string;
}

export class SessionSummaryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ enum: SessionType, example: SessionType.SINGLE })
  session_type: SessionType;

  @ApiProperty({ example: 'http://localhost:3000/uploads/identify/xyz789.wav' })
  audio_url: string;

  @ApiProperty({ example: '2026-04-05T14:30:00.000Z' })
  identified_at: Date;

  @ApiProperty()
  operator: SessionOperatorDto;

  @ApiProperty({ example: 5, description: 'Số kết quả trong results' })
  result_count: number;

  @ApiProperty({ example: 0.94, nullable: true, description: 'Score cao nhất' })
  top_score: number | null;
}

export class SessionPaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  page_size: number;

  @ApiProperty({ example: 28 })
  total: number;

  @ApiProperty({ example: 3 })
  total_pages: number;
}

export class SessionListResponseDto {
  @ApiProperty({ type: [SessionSummaryDto] })
  items: SessionSummaryDto[];

  @ApiProperty()
  pagination: SessionPaginationDto;
}

export class SessionDetailDto extends SessionSummaryDto {
  @ApiProperty({
    description: 'Kết quả nhận dạng chi tiết dạng JSON',
    example: [
      {
        rank: 1,
        voice_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        score: 0.94,
        name: 'Nguyễn Văn A',
        citizen_identification: '012345678901',
        phone_number: '0912345678',
        criminal_record: [{ case: 'Trộm cắp tài sản', year: 2021 }],
      },
    ],
  })
  results: any;
}
