import { z } from "zod";
import { ACCEPTED_AUDIO_EXTENSIONS, ACCEPTED_AUDIO_TYPES } from "@/constants";

function hasAcceptedAudioExtension(fileName: string) {
  const normalizedFileName = fileName.toLowerCase();
  return ACCEPTED_AUDIO_EXTENSIONS.some((extension) =>
    normalizedFileName.endsWith(extension),
  );
}

const audioFileSchema = z
  .custom<File | null>((value) => value === null || value instanceof File, {
    message: "Vui lòng chọn file audio",
  })
  .superRefine((value, ctx) => {
    if (!(value instanceof File)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng chọn file audio",
      });
      return;
    }

    if (value.size <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File audio không hợp lệ",
      });
    }

    if (
      !ACCEPTED_AUDIO_TYPES.includes(
        value.type.toLowerCase() as (typeof ACCEPTED_AUDIO_TYPES)[number],
      ) &&
      !hasAcceptedAudioExtension(value.name)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Định dạng file audio chưa được hỗ trợ",
      });
    }
  })
  .transform((value) => value as File);

const criminalRecordItemSchema = z.object({
  case: z.string().trim().min(1, "Vui lòng nhập nội dung tiền án / tiền sự."),
  year: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn năm.")
    .refine((value) => /^\d{4}$/.test(value), "Năm không hợp lệ."),
});

const genderSchema = z.enum(["", "MALE", "FEMALE"]).default("");

export const uploadVoiceSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập họ tên."),
  citizenIdentification: z.string().trim().optional().default(""),
  phoneNumber: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine(
      (value) => value === "" || /^[0-9]{10,11}$/.test(value),
      "Số điện thoại không hợp lệ (10-11 số).",
    ),
  hometown: z.string().trim().optional().default(""),
  job: z.string().trim().optional().default(""),
  passport: z.string().trim().optional().default(""),
  age: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine(
      (value) => value === "" || (/^\d+$/.test(value) && Number(value) > 0),
      "Tuổi không hợp lệ.",
    ),
  gender: genderSchema,
  criminalRecords: z.array(criminalRecordItemSchema).default([]),
  audioFile: audioFileSchema,
  start: z.number().optional(),
  end: z.number().optional(),
});

export const identifyVoiceSchema = z.object({
  audioFile: audioFileSchema,
  topKRecords: z.coerce
    .number()
    .int("Số lượng kết quả phải là số nguyên")
    .min(1, "Số lượng kết quả phải lớn hơn 0"),
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
