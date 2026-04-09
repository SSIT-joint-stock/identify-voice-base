import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiError } from "@/types";
import { formatError } from "@/utils";
import { voiceApi } from "../api/voice.api";
import type {
  IdentifyTwoVoiceSchemaOutput,
  IdentifyVoiceSchemaOutput,
  UploadVoiceSchemaOutput,
} from "../schemas/voice.schema";
import { useVoiceStore } from "../store/voice.store";

interface UploadVoiceOptions {
  onSuccess?: () => void;
}

interface IdentifyVoiceOptions {
  onSuccess?: () => void;
}

interface IdentifyTwoVoiceOptions {
  onSuccess?: () => void;
}

function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "statusCode" in error;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getDetectedSpeakerCount(message: string) {
  const match = normalizeSearchText(message).match(/phat hien\s+(\d+)\s+nguoi/);
  const rawCount = match?.[1];
  const parsedCount = rawCount ? Number(rawCount) : NaN;
  return Number.isFinite(parsedCount) ? parsedCount : undefined;
}

export function useUploadVoice(options?: UploadVoiceOptions) {
  const setUploadResult = useVoiceStore((state) => state.setUploadResult);

  return useMutation({
    mutationFn: async (values: UploadVoiceSchemaOutput) => {
      const criminalRecordPayload = JSON.stringify(
        (values.criminalRecords ?? [])
          .filter((item) => item.case.trim() && item.year.trim())
          .map((item) => ({
            case: item.case.trim(),
            year: Number(item.year),
          })),
      );

      return voiceApi.uploadVoice({
        name: values.name.trim(),
        citizen_identification: values.citizenIdentification.trim(),
        phone_number: values.phoneNumber.trim(),
        hometown: values.hometown.trim(),
        job: values.job.trim(),
        passport: values.passport.trim(),
        criminal_record: criminalRecordPayload,
        file: values.audioFile,
      });
    },
    onSuccess: (data) => {
      setUploadResult(data);
      toast.success(data.message || "Upload voice thanh cong.");
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });
}

export function useIdentifyVoice(options?: IdentifyVoiceOptions) {
  const setIdentifyResult = useVoiceStore((state) => state.setIdentifyResult);

  return useMutation({
    mutationFn: async (values: IdentifyVoiceSchemaOutput) => {
      return voiceApi.identifyVoice({
        file: values.audioFile,
      });
    },
    onSuccess: (data) => {
      setIdentifyResult(data);

      if (data.items.length === 0) {
        toast.error("Khong co ket qua phu hop.");
        options?.onSuccess?.();
        return;
      }

      toast.success(`Da nhan dien ${data.items.length} ket qua.`);
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });
}

export function useIdentifyTwoVoice(options?: IdentifyTwoVoiceOptions) {
  const setIdentifyTwoResult = useVoiceStore(
    (state) => state.setIdentifyTwoResult,
  );
  const openErrorDialog = useVoiceStore((state) => state.openErrorDialog);

  return useMutation({
    mutationFn: async (values: IdentifyTwoVoiceSchemaOutput) => {
      return voiceApi.identifyTwoVoice({
        file: values.audioFile,
      });
    },
    onSuccess: (data) => {
      setIdentifyTwoResult(data);

      const overCapacityItem = data.items.find(
        (item) =>
          item.message === "Number of speakers exceeds system capacity" ||
          (typeof item.num_speakers === "number" && item.num_speakers > 2),
      );

      if (overCapacityItem) {
        openErrorDialog(
          "So luong nguoi noi vuot qua gioi han",
          `He thong chi ho tro toi da 2 nguoi noi. Gia tri hien tai: ${
            overCapacityItem.num_speakers ?? "khong xac dinh"
          }.`,
        );
        options?.onSuccess?.();
        return;
      }

      if (data.items.length === 0) {
        toast.error("Khong co du lieu nhan dien.");
        options?.onSuccess?.();
        return;
      }

      toast.success(`Da nhan dien ${data.items.length} ket qua.`);
      options?.onSuccess?.();
    },
    onError: (error) => {
      const message = formatError(error);
      const normalizedMessage = normalizeSearchText(message);

      if (
        isApiError(error) &&
        error.statusCode === 422 &&
        (normalizedMessage.includes("toi da 2 nguoi") ||
          normalizedMessage.includes("vuot qua gioi han"))
      ) {
        const detectedSpeakerCount = getDetectedSpeakerCount(message);

        openErrorDialog(
          "So luong nguoi noi vuot qua gioi han",
          `He thong chi ho tro toi da 2 nguoi noi.${
            detectedSpeakerCount
              ? ` Gia tri hien tai: ${detectedSpeakerCount}.`
              : ""
          }`,
        );
        return;
      }

      toast.error(message);
    },
  });
}
