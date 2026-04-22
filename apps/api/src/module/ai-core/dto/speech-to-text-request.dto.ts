import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import {
  SPEECH_TO_TEXT_LANGUAGES,
  type SpeechToTextLanguage,
} from '@/module/ai-core/constants/languages';

const booleanStringToBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
};

export class SpeechToTextRequestDto {
  @IsOptional()
  @IsIn(SPEECH_TO_TEXT_LANGUAGES)
  language?: SpeechToTextLanguage;

  @IsOptional()
  @Transform(({ value }) => booleanStringToBoolean(value))
  @IsBoolean()
  return_timestamp?: boolean;

  @IsOptional()
  @Transform(({ value }) => booleanStringToBoolean(value))
  @IsBoolean()
  denoise_audio?: boolean;
}
