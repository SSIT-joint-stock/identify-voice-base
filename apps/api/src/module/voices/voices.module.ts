import { AiCoreModule } from '@/module/ai-core/ai-core.module';
import { AuthTokenService } from '@/module/auth/service/auth-token.service';
import { StorageModule } from '@/module/storage/storage.module';
import { UploadModule } from '@/module/upload/upload.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SearchUtil } from '@/common/helpers/search.util';
import { VoicesRepository } from './repository/voices.repository';
import { VoicesService } from './service/voices.service';
import { DeleteVoiceUseCase } from './use-cases/delete-voice.usecase';
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
    SearchUtil,
    FindAllVoicesUseCase,
    GetVoiceDetailUseCase,
    UpdateVoiceInfoUseCase,
    UpdateVoiceEmbeddingUseCase,
    DeleteVoiceUseCase,
    AuthTokenService,
  ],
  exports: [VoicesService],
})
export class VoicesModule {}
