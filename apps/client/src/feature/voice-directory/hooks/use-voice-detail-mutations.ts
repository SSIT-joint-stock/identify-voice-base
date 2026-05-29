import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";

import { QUERY_KEYS } from "@/constants";
import { voiceApi } from "@/feature/voice/api/voice.api";
import type { ApiError } from "@/types";

import { voiceDirectoryApi } from "../api/voice-directory.api";
import type { UpdateVoiceDirectoryFormValues } from "../schemas/voice-directory.schema";
import type {
  UpdateVoiceInfoResponse,
  VoiceDirectoryDetail,
} from "../types/voice-directory.types";
import { toUpdatePayload } from "../components/voice-detail/voice-detail.utils";

interface UseVoiceDetailMutationsParams {
  voiceId: string | null;
  detail?: VoiceDirectoryDetail;
  enrollAudioUrl: string | null;
  form: UseFormReturn<UpdateVoiceDirectoryFormValues>;
  selectedAudioIds: Set<string>;
  filteredEnrollAudioFile: File | null;
  fetchProtectedAudioBlob: (audioUrl: string) => Promise<Blob>;
  setSelectedAudioIds: (value: Set<string>) => void;
  setConfirmDeactivateOpen: (open: boolean) => void;
  setConfirmDenoiseOpen: (open: boolean) => void;
  setDenoisePreviewOpen: (open: boolean) => void;
  setFilteredEnrollAudioFile: (file: File | null) => void;
  onOpenChange: (open: boolean) => void;
  onDeactivated: () => void;
  onUpdated?: (payload: UpdateVoiceInfoResponse) => void;
}

function getErrorMessage(err: unknown, fallback: string) {
  return err && typeof err === "object" && "message" in err
    ? String((err as ApiError).message)
    : fallback;
}

export function useVoiceDetailMutations({
  voiceId,
  detail,
  enrollAudioUrl,
  form,
  selectedAudioIds,
  filteredEnrollAudioFile,
  fetchProtectedAudioBlob,
  setSelectedAudioIds,
  setConfirmDeactivateOpen,
  setConfirmDenoiseOpen,
  setDenoisePreviewOpen,
  setFilteredEnrollAudioFile,
  onOpenChange,
  onDeactivated,
  onUpdated,
}: UseVoiceDetailMutationsParams) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!voiceId) throw new Error("Thiếu ID hồ sơ.");
      return voiceDirectoryApi.updateVoiceInfo(
        voiceId,
        toUpdatePayload(form.getValues()),
      );
    },
    onSuccess: (payload) => {
      onUpdated?.(payload);
      toast.success("Cập nhật thông tin cá nhân thành công.");
      onOpenChange(false);
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.voice.directory.detail(voiceId!),
      });
      void queryClient.invalidateQueries({
        queryKey: ["voice", "directory", "list"],
      });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể cập nhật thông tin."));
    },
  });

  const deleteVoiceMutation = useMutation({
    mutationFn: () => {
      if (!voiceId) throw new Error("Thiếu ID hồ sơ.");
      return voiceDirectoryApi.deleteVoice(voiceId);
    },
    onSuccess: () => {
      toast.success("Đã xóa hồ sơ. Hồ sơ sẽ không còn trong danh sách.");
      setConfirmDeactivateOpen(false);
      onOpenChange(false);
      onDeactivated();
      void queryClient.invalidateQueries({
        queryKey: ["voice", "directory"],
      });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể xóa hồ sơ."));
    },
  });

  const embeddingMutation = useMutation({
    mutationFn: () => {
      const vid = detail?.voice_id ?? voiceId;
      if (!vid) throw new Error("Thiếu voice_id.");
      const ids = Array.from(selectedAudioIds);
      if (ids.length === 0) throw new Error("Chọn ít nhất một mẫu âm thanh.");
      return voiceDirectoryApi.updateVoiceFromAudios(vid, ids);
    },
    onSuccess: (data) => {
      toast.success(
        `Đã đưa yêu cầu cập nhật đặc trưng vào hàng đợi. Job: ${data.job_id}`,
      );
      setSelectedAudioIds(new Set());
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.voice.directory.detail(voiceId!),
      });
    },
    onError: (err: unknown) => {
      toast.error(
        getErrorMessage(err, "Không thể khởi tạo cập nhật đặc trưng."),
      );
    },
  });

  const denoiseEnrollAudioMutation = useMutation({
    mutationFn: () => {
      if (!voiceId) throw new Error("Thiếu ID hồ sơ.");
      if (!filteredEnrollAudioFile) {
        throw new Error("Chưa có audio lọc ồn để cập nhật.");
      }
      return voiceDirectoryApi.denoiseEnrollAudio(
        voiceId,
        filteredEnrollAudioFile,
      );
    },
    onSuccess: () => {
      toast.success("Đã lọc ồn và cập nhật audio đăng ký.");
      setConfirmDenoiseOpen(false);
      setDenoisePreviewOpen(false);
      setFilteredEnrollAudioFile(null);
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.voice.directory.detail(voiceId!),
      });
      void queryClient.invalidateQueries({
        queryKey: ["voice", "directory"],
      });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể lọc ồn audio đăng ký."));
    },
  });

  const denoisePreviewMutation = useMutation({
    mutationFn: async () => {
      if (!enrollAudioUrl) throw new Error("Không có audio đăng ký.");

      const sourceBlob = await fetchProtectedAudioBlob(enrollAudioUrl);
      const sourceFile = new File(
        [sourceBlob],
        `${detail?.name || "voice-sample"}.wav`,
        {
          type: sourceBlob.type || "audio/wav",
        },
      );

      return voiceApi.filterNoise(sourceFile);
    },
    onSuccess: (file) => {
      setFilteredEnrollAudioFile(file);
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể tạo audio lọc ồn."));
    },
  });

  return {
    updateMutation,
    deleteVoiceMutation,
    embeddingMutation,
    denoiseEnrollAudioMutation,
    denoisePreviewMutation,
  };
}
