import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  TRANSLATION_LANGUAGES,
  type TranslationLanguage,
} from '@/module/ai-core/constants/languages';

export class TranslateRequestDto {
  @IsString()
  @IsNotEmpty()
  source_text: string;

  @IsOptional()
  @IsIn(TRANSLATION_LANGUAGES)
  target_lang?: TranslationLanguage = 'en';
}

export class DetectLanguageRequestDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}
