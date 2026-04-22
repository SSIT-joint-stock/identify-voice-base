import { AiDeleteVoiceUseCase } from '@/module/ai-core/usecase/ai-delete-voice.usecase';
import { AiIdentifyMultiUseCase } from '@/module/ai-core/usecase/ai-identify-multi.usecase';
import { AiIdentifySingleUseCase } from '@/module/ai-core/usecase/ai-identify-single.usecase';
import { AiOcrUseCase } from '@/module/ai-core/usecase/ai-ocr.usecase';
import { AiSpeechToTextUseCase } from '@/module/ai-core/usecase/ai-speech-to-text.usecase';
import { AiTranslateUseCase } from '@/module/ai-core/usecase/ai-translate.usecase';
import { UploadVoiceUseCase } from '@/module/ai-core/usecase/ai-upload-voice.usecase';
import { Injectable } from '@nestjs/common';
import { OcrRequestDto } from '../dto/ocr-request.dto';
import { SpeechToTextRequestDto } from '../dto/speech-to-text-request.dto';
import {
  DetectLanguageRequestDto,
  TranslateRequestDto,
} from '../dto/translate-request.dto';

@Injectable()
export class AiCoreService {
  constructor(
    private readonly uploadVoiceUseCase: UploadVoiceUseCase,
    private readonly identifySingleUseCase: AiIdentifySingleUseCase,
    private readonly identifyMultiUseCase: AiIdentifyMultiUseCase,
    private readonly deleteVoiceUseCase: AiDeleteVoiceUseCase,
    private readonly ocrUseCase: AiOcrUseCase,
    private readonly speechToTextUseCase: AiSpeechToTextUseCase,
    private readonly translateUseCase: AiTranslateUseCase,
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

  async deleteVoice(voiceId: string) {
    return this.deleteVoiceUseCase.execute(voiceId);
  }

  async ocr(file: Express.Multer.File, dto: OcrRequestDto) {
    return this.ocrUseCase.execute(file, dto);
  }

  async speechToText(file: Express.Multer.File, dto: SpeechToTextRequestDto) {
    return this.speechToTextUseCase.execute(file, dto);
  }

  async translate(dto: TranslateRequestDto) {
    return this.translateUseCase.execute(dto);
  }

  async detectLanguage(dto: DetectLanguageRequestDto) {
    return this.translateUseCase.detectLanguage(dto);
  }

  async translateSummarize(dto: TranslateRequestDto) {
    return this.translateUseCase.translateSummarize(dto);
  }
}
