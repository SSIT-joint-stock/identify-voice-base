import { AiCoreModule } from '@/module/ai-core/ai-core.module';
import { AuthTokenService } from '@/module/auth/service/auth-token.service';
import { UploadModule } from '@/module/upload/upload.module';
import { StorageModule } from '@/module/storage/storage.module';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VoicesRepository } from './repository/voices.repository';
import { VoicesService } from './service/voices.service';
import { UpdateVoiceProcessor } from './service/update-voice.processor';
import { DeactivateVoiceUseCase } from './use-cases/deactivate-voice.usecase';
import { FindAllVoicesUseCase } from './use-cases/find-all-voices.usecase';
import { GetVoiceDetailUseCase } from './use-cases/get-voice-detail.usecase';
import { UpdateVoiceInfoUseCase } from './use-cases/update-voice-info.usecase';
import { UpdateVoiceEmbeddingUseCase } from './use-cases/update-voice-embedding.usecase';
import { VoicesController } from './voices.controller';

@Module({
  imports: [
    AiCoreModule,
    UploadModule,
    StorageModule,
    BullModule.registerQueue({
      name: 'update-voice',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      },
    }),
  ],
  controllers: [VoicesController],
  providers: [
    VoicesService,
    VoicesRepository,
    UpdateVoiceProcessor,
    FindAllVoicesUseCase,
    GetVoiceDetailUseCase,
    UpdateVoiceInfoUseCase,
    UpdateVoiceEmbeddingUseCase,
    DeactivateVoiceUseCase,
    AuthTokenService,
  ],
  exports: [VoicesService],
})
export class VoicesModule {}
