import { z } from "zod";
import { ACCEPTED_AUDIO_TYPES, MAX_AUDIO_FILE_SIZE_BYTES } from "@/constants";

const audioFileSchema = z
  .custom<File | null>((value) => value === null || value instanceof File, {
    message: "Vui long chon file audio.",
  })
  .superRefine((value, ctx) => {
    if (!(value instanceof File)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui long chon file audio.",
      });
      return;
    }

    if (value.size <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File audio khong hop le.",
      });
    }

    if (value.size > MAX_AUDIO_FILE_SIZE_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `File audio khong duoc vuot qua ${MAX_AUDIO_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
      });
    }

    if (
      !ACCEPTED_AUDIO_TYPES.includes(
        value.type as (typeof ACCEPTED_AUDIO_TYPES)[number],
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Dinh dang file audio chua duoc ho tro.",
      });
    }
  })
  .transform((value) => value as File);

const criminalRecordItemSchema = z.object({
  case: z.string().trim().min(1, "Vui long nhap noi dung tien an / tien su."),
  year: z
    .string()
    .trim()
    .min(1, "Vui long chon nam.")
    .refine((value) => /^\d{4}$/.test(value), "Nam khong hop le."),
});

export const uploadVoiceSchema = z.object({
  name: z.string().trim().min(1, "Vui long nhap ho ten."),
  citizenIdentification: z.string().trim().optional().default(""),
  phoneNumber: z.string().trim().optional().default(""),
  hometown: z.string().trim().optional().default(""),
  job: z.string().trim().optional().default(""),
  passport: z.string().trim().optional().default(""),
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

export type IdentifyTwoVoiceSchemaInput = z.input<
  typeof identifyTwoVoiceSchema
>;
export type IdentifyTwoVoiceSchemaOutput = z.output<
  typeof identifyTwoVoiceSchema
>;
