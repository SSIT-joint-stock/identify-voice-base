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

export const TRANSLATE_EXPORT_FORMATS = ['docx', 'pdf'] as const;
export type TranslateExportFormat = (typeof TRANSLATE_EXPORT_FORMATS)[number];

export class TranslateExportRequestDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsIn(TRANSLATE_EXPORT_FORMATS)
  format: TranslateExportFormat;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
