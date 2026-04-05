import { PrismaService } from '@/database/prisma/prisma.service';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { SessionType } from '@prisma/client';
import { Queue } from 'bullmq';

interface StartIdentifyInput {
  userId: string;
  session_type: SessionType;
  audio_url: string;
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
        audio_url: input.audio_url,
        results: [],
      },
    });

    // Enqueue job for background processing
    await this.voiceQueue.add('identify-voice', {
      sessionId: session.id,
      audioUrl: session.audio_url,
      sessionType: session.session_type,
    });

    return session;
  }
}
