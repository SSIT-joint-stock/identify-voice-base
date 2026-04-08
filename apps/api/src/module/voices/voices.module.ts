import { AuthTokenService } from '@/module/auth/service/auth-token.service';
import { Module } from '@nestjs/common';
import { VoicesRepository } from './repository/voices.repository';
import { VoicesService } from './service/voices.service';
import { FindAllVoicesUseCase } from './use-cases/find-all-voices.usecase';
import { GetVoiceDetailUseCase } from './use-cases/get-voice-detail.usecase';
import { UpdateVoiceInfoUseCase } from './use-cases/update-voice-info.usecase';
import { VoicesController } from './voices.controller';

@Module({
  controllers: [VoicesController],
  providers: [
    VoicesService,
    VoicesRepository,
    FindAllVoicesUseCase,
    GetVoiceDetailUseCase,
    UpdateVoiceInfoUseCase,
    AuthTokenService,
  ],
  exports: [VoicesService],
})
export class VoicesModule {}
