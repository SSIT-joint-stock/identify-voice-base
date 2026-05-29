import { useState } from "react";
import { toast } from "sonner";

import { downloadAudioBlob } from "../components/voice-detail/voice-detail.utils";

interface UseVoiceDetailAudioParams {
  fetchProtectedAudioBlob: (audioUrl: string) => Promise<Blob>;
}

export function useVoiceDetailAudio({
  fetchProtectedAudioBlob,
}: UseVoiceDetailAudioParams) {
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [confirmDenoiseOpen, setConfirmDenoiseOpen] = useState(false);
  const [denoisePreviewOpen, setDenoisePreviewOpen] = useState(false);
  const [filteredEnrollAudioFile, setFilteredEnrollAudioFile] =
    useState<File | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  const resetSheetAudioState = () => {
    setDuplicateDialogOpen(false);
    setDenoisePreviewOpen(false);
    setConfirmDenoiseOpen(false);
    setFilteredEnrollAudioFile(null);
  };

  const openDenoisePreview = (startPreview: () => void) => {
    setDenoisePreviewOpen(true);
    setFilteredEnrollAudioFile(null);
    startPreview();
  };

  const downloadEnrollAudio = async (
    enrollAudioUrl: string | null,
    fileName: string,
  ) => {
    if (!enrollAudioUrl) return;

    try {
      const blob = await fetchProtectedAudioBlob(enrollAudioUrl);
      downloadAudioBlob(blob, fileName);
      toast.success("Đã tải audio nguồn.");
    } catch {
      toast.error("Không thể tải audio nguồn.");
    }
  };

  const downloadFilteredAudio = (fallbackFileName: string) => {
    if (!filteredEnrollAudioFile) return;

    downloadAudioBlob(
      filteredEnrollAudioFile,
      filteredEnrollAudioFile.name || fallbackFileName,
    );
    toast.success("Đã tải audio đã lọc.");
  };

  return {
    confirmDeactivateOpen,
    confirmDenoiseOpen,
    denoisePreviewOpen,
    duplicateDialogOpen,
    filteredEnrollAudioFile,
    setConfirmDeactivateOpen,
    setConfirmDenoiseOpen,
    setDenoisePreviewOpen,
    setDuplicateDialogOpen,
    setFilteredEnrollAudioFile,
    resetSheetAudioState,
    openDenoisePreview,
    downloadEnrollAudio,
    downloadFilteredAudio,
  };
}
