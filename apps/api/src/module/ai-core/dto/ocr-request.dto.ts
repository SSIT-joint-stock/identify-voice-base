import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import {
  OCR_LANGUAGES,
  type OcrLanguage,
} from '@/module/ai-core/constants/languages';

const booleanStringToBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
};

export class OcrRequestDto {
  @IsOptional()
  @IsIn(OCR_LANGUAGES)
  language?: OcrLanguage;

  @IsOptional()
  @Transform(({ value }) => booleanStringToBoolean(value))
  @IsBoolean()
  format?: boolean;
}
