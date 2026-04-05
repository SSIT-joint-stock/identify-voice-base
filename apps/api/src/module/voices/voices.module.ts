import { Module } from '@nestjs/common';
import { VoicesController } from './voices.controller';
import { VoicesService } from './service/voices.service';
import { CreateVoiceRecordUseCase } from './use-cases/create-voice-record.usecase';
import { GetVoiceRecordUseCase } from './use-cases/get-voice-record.usecase';

@Module({
  controllers: [VoicesController],
  providers: [VoicesService, CreateVoiceRecordUseCase, GetVoiceRecordUseCase],
  exports: [VoicesService],
})
export class VoicesModule {}
