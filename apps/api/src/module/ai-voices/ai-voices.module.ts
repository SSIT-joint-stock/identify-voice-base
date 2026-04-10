import { PrismaModule } from '@/database/prisma/prisma.module';
import { AuthTokenService } from '@/module/auth/service/auth-token.service';
import { Module } from '@nestjs/common';
import { AiVoicesController } from './ai-voices.controller';
import { AiVoicesRepository } from './repository/ai-voices.repository';
import { ConvertAiVoiceUseCase } from './use-cases/convert-ai-voice.usecase';
import { FindAllAiVoicesUseCase } from './use-cases/find-all-ai-voices.usecase';
import { GetAiVoiceDetailUseCase } from './use-cases/get-voice-detail-ai.usecase';

@Module({
  imports: [PrismaModule],
  controllers: [AiVoicesController],
  providers: [
    AiVoicesRepository,
    FindAllAiVoicesUseCase,
    GetAiVoiceDetailUseCase,
    ConvertAiVoiceUseCase,
    AuthTokenService,
  ],
  exports: [AiVoicesRepository],
})
export class AiVoicesModule {}
