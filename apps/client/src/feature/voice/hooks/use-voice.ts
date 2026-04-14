import type { ApiError } from "@/types";
import { formatError } from "@/utils";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
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
      toast.success(data.message || "Tải lên giọng nói thành công!");
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
        toast.error("Không có kết quả nào phù hợp.");
        options?.onSuccess?.();
        return;
      }

      toast.success(`Đã nhận diện ${data.items.length} kết quả.`);
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
          item.message === "Số người nói vượt quá tối đa. Tối đa 2 người nói" ||
          (typeof item.num_speakers === "number" && item.num_speakers > 2),
      );

      if (overCapacityItem) {
        openErrorDialog(
          "Số lượng người nói vượt quá giới hạn",
          `Hệ thống chỉ hỗ trợ tối đa 2 người nói. Giá trị hiện tại: ${
            overCapacityItem.num_speakers ?? "Không xác định"
          }.`,
        );
        options?.onSuccess?.();
        return;
      }

      if (data.items.length === 0) {
        toast.error("Không có dữ liệu nhận diện.");
        options?.onSuccess?.();
        return;
      }

      toast.success(`Đã nhận diện ${data.items.length} kết quả.`);
      options?.onSuccess?.();
    },
    onError: (error) => {
      const message = formatError(error);
      const normalizedMessage = normalizeSearchText(message);

      if (
        isApiError(error) &&
        error.statusCode === 422 &&
        (normalizedMessage.includes("tối đa 2 người") ||
          normalizedMessage.includes("vượt quá giới hạn") ||
          (normalizedMessage.includes("phat hien") &&
            normalizedMessage.includes("nguoi")))
      ) {
        const detectedSpeakerCount = getDetectedSpeakerCount(message);

        openErrorDialog(
          "Số lượng người nói vượt quá giới hạn",
          `Hệ thống chỉ hỗ trợ tối đa 2 người nói.${
            detectedSpeakerCount
              ? ` Giá trị hiện tại: ${detectedSpeakerCount}.`
              : ""
          }`,
        );
        return;
      }

      toast.error(message);
    },
  });
}
