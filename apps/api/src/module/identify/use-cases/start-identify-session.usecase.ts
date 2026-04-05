import { PrismaService } from '@/database/prisma/prisma.service';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { SessionType } from '@prisma/client';
import { Queue } from 'bullmq';

interface StartIdentifyInput {
  userId: string;
  session_type: SessionType;
  audio_file_id: string;
}

@Injectable()
export class StartIdentifySessionUseCase implements BaseUseCase<
  StartIdentifyInput,
  any
> {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('voice-identification') private readonly voiceQueue: Queue,
  ) {}

  async execute(input: StartIdentifyInput) {
    const session = await this.prisma.identify_sessions.create({
      data: {
        user_id: input.userId,
        session_type: input.session_type,
        audio_file_id: input.audio_file_id,
        results: [],
      },
      include: {
        audio_file: true,
      },
    });

    // Enqueue job for background processing
    await this.voiceQueue.add('identify-voice', {
      sessionId: session.id,
      audioUrl: session.audio_file.file_path, // Temporary using file_path, should be converted to URL if needed by AI service
      sessionType: session.session_type,
    });

    return session;
  }
}
