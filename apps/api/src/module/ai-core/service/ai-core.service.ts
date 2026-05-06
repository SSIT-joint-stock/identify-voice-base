import { AiDeleteVoiceUseCase } from '@/module/ai-core/usecase/ai-delete-voice.usecase';
import { AiFilterNoiseUseCase } from '@/module/ai-core/usecase/ai-filter-noise.usecase';
import { AiIdentifyMultiUseCase } from '@/module/ai-core/usecase/ai-identify-multi.usecase';
import { AiIdentifySingleUseCase } from '@/module/ai-core/usecase/ai-identify-single.usecase';
import { AiOcrUseCase } from '@/module/ai-core/usecase/ai-ocr.usecase';
import { AiSpeechToTextUseCase } from '@/module/ai-core/usecase/ai-speech-to-text.usecase';
import { AiTranslateUseCase } from '@/module/ai-core/usecase/ai-translate.usecase';
import { UploadVoiceUseCase } from '@/module/ai-core/usecase/ai-upload-voice.usecase';
import { TranslationHistoryService } from '@/module/translation-history/service/translation-history.service';
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
    private readonly filterNoiseUseCase: AiFilterNoiseUseCase,
    private readonly translateUseCase: AiTranslateUseCase,
    private readonly translationHistoryService: TranslationHistoryService,
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

  async filterNoise(file: Express.Multer.File) {
    return this.filterNoiseUseCase.execute(file);
  }

  async translate(dto: TranslateRequestDto, userId?: string) {
    const result = await this.translateUseCase.execute(dto);
    await this.recordTranslation(dto, result, 'translate', userId);

    return result;
  }

  async detectLanguage(dto: DetectLanguageRequestDto) {
    return this.translateUseCase.detectLanguage(dto);
  }

  async translateSummarize(dto: TranslateRequestDto, userId?: string) {
    const result = await this.translateUseCase.translateSummarize(dto);
    await this.recordTranslation(dto, result, 'summarize', userId);

    return result;
  }

  private async recordTranslation(
    dto: TranslateRequestDto,
    result: unknown,
    mode: 'translate' | 'summarize',
    userId?: string,
  ) {
    if (!userId || !result || typeof result !== 'object') {
      return;
    }

    const translatedText = (result as Record<string, unknown>).translated_text;

    if (typeof translatedText !== 'string') {
      return;
    }

    await this.translationHistoryService.recordTranslation({
      userId,
      sourceText: dto.source_text,
      translatedText,
      sourceLang: dto.source_lang,
      targetLang: dto.target_lang,
      sourceFileType: dto.source_file_type,
      mode,
    });
  }
}
