import { PrismaService } from '@/database/prisma/prisma.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('voice-identification')
export class VoiceProcessor extends WorkerHost {
  private readonly logger = new Logger(VoiceProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { sessionId, audioUrl, sessionType } = job.data;
    this.logger.log(
      `Processing voice identification for session: ${sessionId}`,
    );

    try {
      // Logic for voice identification (e.g. calling an AI service)
      // This is a placeholder for the actual extraction/identification logic
      const results = {
        confidence: 0.95,
        matched_voice_id: 'sample-uuid',
        recognized_text: 'Sample recognized text',
      };

      await this.prisma.identify_sessions.update({
        where: { id: sessionId },
        data: {
          results: results,
          identified_at: new Date(),
        },
      });

      this.logger.log(`Session ${sessionId} processed successfully`);
      return results;
    } catch (error) {
      this.logger.error(
        `Failed to process session ${sessionId}: ${error.message}`,
      );
      throw error;
    }
  }
}
