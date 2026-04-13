import { Injectable } from '@nestjs/common';

type AudioSegment = { start: number; end: number };
@Injectable()
export class SegmentUtil {
  isValidSegment(value: unknown): value is AudioSegment {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { start?: unknown }).start === 'number' &&
      Number.isFinite((value as { start: number }).start) &&
      typeof (value as { end?: unknown }).end === 'number' &&
      Number.isFinite((value as { end: number }).end) &&
      (value as { end: number }).end > (value as { start: number }).start
    );
  }

  extractSegments(value: unknown): AudioSegment[] {
    if (Array.isArray(value)) {
      return value.filter((v) => this.isValidSegment(v));
    }

    if (typeof value !== 'object' || value === null) {
      return [];
    }

    const candidate = value as {
      segments?: unknown;
      audio_segment?: unknown;
      raw_ai_data?: { segments?: unknown; audio_segment?: unknown };
    };

    const sources = [
      candidate.segments,
      candidate.audio_segment,
      candidate.raw_ai_data?.segments,
      candidate.raw_ai_data?.audio_segment,
    ];

    for (const source of sources) {
      const segments = this.extractSegments(source);
      if (segments.length > 0) {
        return segments;
      }
    }

    return [];
  }
}
