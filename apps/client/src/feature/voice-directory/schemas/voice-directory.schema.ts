import { z } from "zod";

const criminalRecordItemSchema = z.object({
  case: z.string().trim().min(1, "Nhập tội danh / vụ việc."),
  year: z
    .string()
    .trim()
    .min(1, "Nhập năm.")
    .refine((value) => /^\d{4}$/.test(value), "Năm gồm 4 chữ số."),
});

export const updateVoiceDirectoryFormSchema = z.object({
  name: z.string().trim().min(1, "Nhập họ tên.").max(100),
  citizen_identification: z.string().trim().max(20),
  phone_number: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^[0-9]{10,11}$/.test(v),
      "Số điện thoại gồm 10–11 chữ số.",
    ),
  hometown: z.string().trim().max(200),
  job: z.string().trim().max(100),
  passport: z.string().trim(),
  criminal_record: z.array(criminalRecordItemSchema),
});

export type UpdateVoiceDirectoryFormValues = z.infer<
  typeof updateVoiceDirectoryFormSchema
>;
