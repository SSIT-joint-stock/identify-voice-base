import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import {
  SPEECH_TO_TEXT_LANGUAGES,
  TRANSLATION_LANGUAGES,
  type SpeechToTextLanguage,
  type TranslationLanguage,
} from '@/module/ai-core/constants/languages';

const booleanStringToBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
};

const rawBooleanStringToBoolean = ({
  obj,
  key,
  value,
}: {
  obj: Record<string, unknown>;
  key: string;
  value: unknown;
}) => booleanStringToBoolean(obj[key] ?? value);

export class BatchFileTranslateDto {
  @IsOptional()
  @IsIn(SPEECH_TO_TEXT_LANGUAGES)
  source_lang?: SpeechToTextLanguage;

  @IsOptional()
  @IsIn(TRANSLATION_LANGUAGES)
  target_lang?: TranslationLanguage = 'en';

  @IsOptional()
  @Transform(rawBooleanStringToBoolean)
  @IsBoolean()
  return_timestamp?: boolean;

  @IsOptional()
  @Transform(rawBooleanStringToBoolean)
  @IsBoolean()
  denoise_audio?: boolean;

  @IsOptional()
  @IsString()
  file_options?: string;
}

export interface BatchFileItemOptionDto {
  source_lang?: SpeechToTextLanguage;
  target_lang?: TranslationLanguage;
  return_timestamp?: boolean;
  denoise_audio?: boolean;
}

export class RetryBatchFileItemDto {
  @IsOptional()
  @IsIn(SPEECH_TO_TEXT_LANGUAGES)
  source_lang?: SpeechToTextLanguage;

  @IsOptional()
  @IsIn(TRANSLATION_LANGUAGES)
  target_lang?: TranslationLanguage;

  @IsOptional()
  @Transform(rawBooleanStringToBoolean)
  @IsBoolean()
  return_timestamp?: boolean;

  @IsOptional()
  @Transform(rawBooleanStringToBoolean)
  @IsBoolean()
  denoise_audio?: boolean;
}
