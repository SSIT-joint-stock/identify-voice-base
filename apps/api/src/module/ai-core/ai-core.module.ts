import { AiCoreService } from '@/module/ai-core/service/ai-core.service';
import { AuthTokenService } from '@/module/auth/service/auth-token.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiCoreController } from './ai-core.controller';
import { AudioNormalizeService } from './service/audio-normalize.service';
import { AudioSegmentService } from './service/audio-segment.service';
import { AiDeleteVoiceUseCase } from './usecase/ai-delete-voice.usecase';
import { AiIdentifyMultiUseCase } from './usecase/ai-identify-multi.usecase';
import { AiIdentifySingleUseCase } from './usecase/ai-identify-single.usecase';
import { AiOcrUseCase } from './usecase/ai-ocr.usecase';
import { AiSpeechToTextUseCase } from './usecase/ai-speech-to-text.usecase';
import { AiTranslateUseCase } from './usecase/ai-translate.usecase';
import { UploadVoiceUseCase } from './usecase/ai-upload-voice.usecase';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [AiCoreController],
  providers: [
    AiCoreService,
    AudioNormalizeService,
    AudioSegmentService,
    UploadVoiceUseCase,
    AiIdentifySingleUseCase,
    AiIdentifyMultiUseCase,
    AiDeleteVoiceUseCase,
    AiOcrUseCase,
    AiSpeechToTextUseCase,
    AiTranslateUseCase,
    AuthTokenService,
  ],
  exports: [AiCoreService, AudioNormalizeService, AudioSegmentService],
})
export class AiCoreModule {}
