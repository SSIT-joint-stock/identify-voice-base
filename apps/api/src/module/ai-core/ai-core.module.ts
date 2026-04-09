import { AiCoreService } from '@/module/ai-core/service/ai-core.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiDeleteVoiceUseCase } from './usecase/ai-delete-voice.usecase';
import { AiIdentifyMultiUseCase } from './usecase/ai-identify-multi.usecase';
import { AiIdentifySingleUseCase } from './usecase/ai-identify-single.usecase';
import { UploadVoiceUseCase } from './usecase/ai-upload-voice.usecase';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    AiCoreService,
    UploadVoiceUseCase,
    AiIdentifySingleUseCase,
    AiIdentifyMultiUseCase,
    AiDeleteVoiceUseCase,
  ],
  exports: [AiCoreService],
})
export class AiCoreModule {}
