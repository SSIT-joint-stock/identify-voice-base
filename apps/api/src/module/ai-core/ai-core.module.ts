import { AiCoreService } from '@/module/ai-core/ai-core.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AICoreIdentifyMultiUseCase } from './usecase/ai-identify-multi.usecase';
import { AICoreIdentifySingleUseCase } from './usecase/ai-identify-single.usecase';
import { UploadVoiceUseCase } from './usecase/ai-upload-voice.usecase';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    AiCoreService,
    UploadVoiceUseCase,
    AICoreIdentifyMultiUseCase,
    AICoreIdentifySingleUseCase,
  ],
  exports: [AiCoreService],
})
export class AiCoreModule {}
