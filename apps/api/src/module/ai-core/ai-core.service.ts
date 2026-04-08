import { AICoreIdentifyMultiUseCase } from '@/module/ai-core/usecase/ai-identify-multi.usecase';
import { AICoreIdentifySingleUseCase } from '@/module/ai-core/usecase/ai-identify-single.usecase';
import { UploadVoiceUseCase } from '@/module/ai-core/usecase/ai-upload-voice.usecase';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AiCoreService {
  constructor(
    private readonly uploadVoiceUseCase: UploadVoiceUseCase,
    private readonly identifySingleUseCase: AICoreIdentifySingleUseCase,
    private readonly identifyMultiUseCase: AICoreIdentifyMultiUseCase,
  ) {}

  async uploadVoice(filePath: string, name: string, mimeType?: string) {
    return this.uploadVoiceUseCase.execute(filePath, name, mimeType);
  }

  async identifySingle(filePath: string, mimeType?: string) {
    return this.identifySingleUseCase.execute(filePath, mimeType);
  }

  async identifyMulti(filePath: string, mimeType?: string) {
    return this.identifyMultiUseCase.execute(filePath, mimeType);
  }
}
