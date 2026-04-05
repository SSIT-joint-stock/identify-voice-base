import { z } from 'zod';
import { ACCEPTED_AUDIO_TYPES, MAX_AUDIO_FILE_SIZE_BYTES } from '@/constants';

const audioFileSchema = z
  .custom<File | null>((value) => value === null || value instanceof File, {
    message: 'Vui lòng chọn file audio.',
  })
  .refine((file): file is File => file instanceof File, 'Vui lòng chọn file audio.')
  .refine((file) => file.size > 0, 'File audio không hợp lệ.')
  .refine(
    (file) => file.size <= MAX_AUDIO_FILE_SIZE_BYTES,
    `File audio không được vượt quá ${MAX_AUDIO_FILE_SIZE_BYTES / 1024 / 1024}MB.`
  )
  .refine(
    (file) => ACCEPTED_AUDIO_TYPES.includes(file.type as (typeof ACCEPTED_AUDIO_TYPES)[number]),
    'Định dạng file audio chưa được hỗ trợ.'
  )
  .transform((file) => file as File);

const criminalRecordItemSchema = z.object({
  case: z.string().trim().min(1, 'Vui lòng nhập nội dung tiền án / tiền sự.'),
  year: z
    .string()
    .trim()
    .min(1, 'Vui lòng chọn năm.')
    .refine((value) => /^\d{4}$/.test(value), 'Năm không hợp lệ.'),
});

export const uploadVoiceSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên.'),
  citizenIdentification: z.string().trim().optional().default(''),
  phoneNumber: z.string().trim().optional().default(''),
  hometown: z.string().trim().optional().default(''),
  job: z.string().trim().optional().default(''),
  passport: z.string().trim().optional().default(''),
  criminalRecords: z.array(criminalRecordItemSchema).default([]),
  audioFile: audioFileSchema,
  start: z.number().optional(),
  end: z.number().optional(),
});

export const identifyVoiceSchema = z.object({
  audioFile: audioFileSchema,
});

export const identifyTwoVoiceSchema = z.object({
  audioFile: audioFileSchema,
});

export type UploadVoiceSchemaInput = z.input<typeof uploadVoiceSchema>;
export type UploadVoiceSchemaOutput = z.output<typeof uploadVoiceSchema>;

export type IdentifyVoiceSchemaInput = z.input<typeof identifyVoiceSchema>;
export type IdentifyVoiceSchemaOutput = z.output<typeof identifyVoiceSchema>;

export type IdentifyTwoVoiceSchemaInput = z.input<typeof identifyTwoVoiceSchema>;
export type IdentifyTwoVoiceSchemaOutput = z.output<typeof identifyTwoVoiceSchema>;
