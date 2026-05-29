import type { UpdateVoiceDirectoryFormValues } from "../../schemas/voice-directory.schema";
import type { VoiceDirectoryDetail } from "../../types/voice-directory.types";

export function normalizeCriminalForForm(
  value: VoiceDirectoryDetail["criminal_record"],
): UpdateVoiceDirectoryFormValues["criminal_record"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (row): row is { case: string; year: number } =>
        row !== null &&
        typeof row === "object" &&
        typeof (row as { case?: unknown }).case === "string" &&
        typeof (row as { year?: unknown }).year === "number",
    )
    .map((row) => ({
      case: row.case,
      year: String(row.year),
    }));
}

function toNullableTrimmedValue(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

export function toUpdatePayload(values: UpdateVoiceDirectoryFormValues) {
  return {
    name: values.name.trim(),
    citizen_identification: toNullableTrimmedValue(
      values.citizen_identification,
    ),
    phone_number: toNullableTrimmedValue(values.phone_number),
    hometown: toNullableTrimmedValue(values.hometown),
    job: toNullableTrimmedValue(values.job),
    passport: toNullableTrimmedValue(values.passport),
    age: values.age ? Number(values.age) : null,
    gender: values.gender || null,
    criminal_record: values.criminal_record.map((row) => ({
      case: row.case.trim(),
      year: Number.parseInt(row.year, 10),
    })),
  };
}

export function downloadAudioBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
