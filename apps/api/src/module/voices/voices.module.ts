import { AiCoreModule } from '@/module/ai-core/ai-core.module';
import { AuthTokenService } from '@/module/auth/service/auth-token.service';
import { UploadModule } from '@/module/upload/upload.module';
import { Module } from '@nestjs/common';
import { VoicesRepository } from './repository/voices.repository';
import { VoicesService } from './service/voices.service';
import { DeleteVoiceUseCase } from './use-cases/delete-voice.usecase';
import { FindAllVoicesUseCase } from './use-cases/find-all-voices.usecase';
import { GetVoiceDetailUseCase } from './use-cases/get-voice-detail.usecase';
import { UpdateVoiceInfoUseCase } from './use-cases/update-voice-info.usecase';
import { VoicesController } from './voices.controller';

@Module({
  imports: [AiCoreModule, UploadModule],
  controllers: [VoicesController],
  providers: [
    VoicesService,
    VoicesRepository,
    FindAllVoicesUseCase,
    GetVoiceDetailUseCase,
    UpdateVoiceInfoUseCase,
    DeleteVoiceUseCase,
    AuthTokenService,
  ],
  exports: [VoicesService],
})
export class VoicesModule {}
