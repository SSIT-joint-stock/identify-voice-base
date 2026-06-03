import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { QUERY_KEYS } from "@/constants";

import { VoiceTranscriptDialog } from "@/feature/voice/components/voice-transcript-dialog";
import { useNormalizeAudio } from "@/feature/voice/hooks/use-normalize-audio";
import { useVoiceSpeechToTextDialog } from "@/feature/voice/hooks/use-voice-speech-to-text-dialog";
import { voiceDirectoryApi } from "../api/voice-directory.api";
import { useVoiceDetailAudio } from "../hooks/use-voice-detail-audio";
import { useVoiceDetailForm } from "../hooks/use-voice-detail-form";
import { useVoiceDetailHistory } from "../hooks/use-voice-detail-history";
import { useVoiceDetailMutations } from "../hooks/use-voice-detail-mutations";
import type { UpdateVoiceInfoResponse } from "../types/voice-directory.types";
import { VoiceDuplicateMatchesDialog } from "./VoiceDuplicateMatchesDialog";
import { ConfirmDeleteDialog } from "./voice-detail/confirm-delete-dialog";
import { ConfirmDenoiseDialog } from "./voice-detail/confirm-denoise-dialog";
import { IdentifyHistoryTable } from "./voice-detail/identify-history-table";
import { NoiseFilterCompareDialog } from "./voice-detail/noise-filter-compare-dialog";
import { RegisteredAudioSection } from "./voice-detail/registered-audio-section";
import { SessionAudioDialog } from "./voice-detail/session-audio-dialog";
import { VoiceProfileForm } from "./voice-detail/voice-profile-form";

export interface VoiceDirectoryDetailSheetProps {
  voiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeactivated: () => void;
  onUpdated?: (payload: UpdateVoiceInfoResponse) => void;
}

export function VoiceDirectoryDetailSheet({
  voiceId,
  open,
  onOpenChange,
  onDeactivated,
  onUpdated,
}: VoiceDirectoryDetailSheetProps) {
  const { fetchProtectedAudioBlob } = useNormalizeAudio();
  const loadAudioFileFromUrl = useCallback(
    async (audioUrl: string, fileName: string) => {
      const blob = await fetchProtectedAudioBlob(audioUrl);
      return new File([blob], fileName, {
        type: blob.type || "audio/wav",
        lastModified: Date.now(),
      });
    },
    [fetchProtectedAudioBlob],
  );
  const speechToTextDialog = useVoiceSpeechToTextDialog({
    loadAudioFileFromUrl,
  });

  const detailQuery = useQuery({
    queryKey: voiceId
      ? QUERY_KEYS.voice.directory.detail(voiceId)
      : ["voice", "directory", "detail", "none"],
    queryFn: () => voiceDirectoryApi.getVoiceDetail(voiceId!),
    enabled: Boolean(voiceId && open),
  });

  const detail = detailQuery.data;
  const canModify = detail?.can_modify ?? false;
  const enrollAudioUrl = detail?.audio_url?.trim() || null;
  const enrollAudioTranscriptKey = detail
    ? `voice-detail-${detail.id}-enroll-audio`
    : "voice-detail-enroll-audio";

  const { form, fields, append, remove } = useVoiceDetailForm(detail);
  const {
    historyRows,
    previewSessionId,
    previewSessionRow,
    selectedAudioIds,
    setPreviewSessionId,
    setSelectedAudioIds,
    toggleAudioSelection,
  } = useVoiceDetailHistory(detail);
  const {
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
  } = useVoiceDetailAudio({ fetchProtectedAudioBlob });
  const {
    updateMutation,
    deleteVoiceMutation,
    embeddingMutation,
    denoiseEnrollAudioMutation,
    denoisePreviewMutation,
  } = useVoiceDetailMutations({
    voiceId,
    detail,
    enrollAudioUrl,
    form,
    selectedAudioIds,
    filteredEnrollAudioFile,
    canModify,
    fetchProtectedAudioBlob,
    setSelectedAudioIds,
    setConfirmDeactivateOpen,
    setConfirmDenoiseOpen,
    setDenoisePreviewOpen,
    setFilteredEnrollAudioFile,
    onOpenChange,
    onDeactivated,
    onUpdated,
  });

  const sessionPreviewQuery = useQuery({
    queryKey: previewSessionId
      ? QUERY_KEYS.voice.sessionAudio(previewSessionId)
      : ["voice", "directory", "session", "none"],
    queryFn: () => voiceDirectoryApi.getSessionDetail(previewSessionId!),
    enabled: Boolean(previewSessionId),
  });

  const sheetTitle = useMemo(() => {
    if (!detail) return "Chi tiết hồ sơ";
    return detail.name || "Chi tiết hồ sơ";
  }, [detail]);
  const handleSheetOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetSheetAudioState();
    }

    onOpenChange(nextOpen);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-xl md:max-w-4xl"
          showCloseButton
        >
          <SheetHeader className="shrink-0 border-b pb-4 text-left">
            <SheetTitle>{sheetTitle}</SheetTitle>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            {detailQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Đang tải chi tiết…
              </div>
            ) : detailQuery.isError ? (
              <p className="text-sm text-destructive">
                Không tải được chi tiết hồ sơ. Thử đóng và mở lại.
              </p>
            ) : detail ? (
              <>
                <RegisteredAudioSection
                  audioUrl={enrollAudioUrl}
                  fileName={`${detail.name || "voice-sample"}.wav`}
                  canModify={canModify}
                  isDenoising={
                    denoiseEnrollAudioMutation.isPending ||
                    denoisePreviewMutation.isPending
                  }
                  isTranscribing={
                    speechToTextDialog.loadingAudioKey ===
                      enrollAudioTranscriptKey ||
                    speechToTextDialog.runningKey === enrollAudioTranscriptKey
                  }
                  onOpenDenoisePreview={() =>
                    openDenoisePreview(() => denoisePreviewMutation.mutate())
                  }
                  onOpenDuplicateDialog={() => setDuplicateDialogOpen(true)}
                  onOpenTranscript={() => {
                    if (!enrollAudioUrl) return;
                    void speechToTextDialog.runAudioUrl({
                      audioUrl: enrollAudioUrl,
                      fileName: `${detail.name || "voice-sample"}.wav`,
                      key: enrollAudioTranscriptKey,
                      title: `Nội dung audio - ${detail.name || "Mẫu giọng đăng ký"}`,
                      loadingText: "Đang tải nội dung audio đăng ký...",
                      backgroundMessage:
                        "Đang chạy S2T audio đăng ký trong nền...",
                      successMessage: "Đã xử lý xong nội dung audio đăng ký.",
                    });
                  }}
                />
                <VoiceProfileForm
                  form={form}
                  fields={fields}
                  append={append}
                  remove={remove}
                  isSaving={updateMutation.isPending}
                  canModify={canModify}
                  onSubmit={() => updateMutation.mutate()}
                />
                <hr />
                <IdentifyHistoryTable
                  rows={historyRows}
                  selectedAudioIds={selectedAudioIds}
                  canModify={canModify}
                  canUpdateEmbedding={
                    canModify &&
                    selectedAudioIds.size > 0 &&
                    Boolean(detail.voice_id)
                  }
                  isUpdatingEmbedding={embeddingMutation.isPending}
                  onToggleAudioSelection={toggleAudioSelection}
                  onUpdateEmbedding={() => embeddingMutation.mutate()}
                  onOpenSessionAudio={setPreviewSessionId}
                />

                {canModify ? (
                  <div className="border-t pt-4">
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full sm:w-auto"
                      onClick={() => setConfirmDeactivateOpen(true)}
                    >
                      Xóa hồ sơ
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {duplicateDialogOpen ? (
        <VoiceDuplicateMatchesDialog
          open={duplicateDialogOpen}
          onOpenChange={setDuplicateDialogOpen}
          audioUrl={enrollAudioUrl}
          currentUserId={detail?.id}
          currentVoiceId={detail?.voice_id}
          currentName={detail?.name}
        />
      ) : null}

      <SessionAudioDialog
        sessionId={previewSessionId}
        historyRow={previewSessionRow}
        isLoading={sessionPreviewQuery.isLoading}
        sessionDetail={sessionPreviewQuery.data}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPreviewSessionId(null);
          }
        }}
      />

      <ConfirmDeleteDialog
        open={confirmDeactivateOpen}
        isPending={deleteVoiceMutation.isPending}
        onOpenChange={setConfirmDeactivateOpen}
        onConfirm={() => deleteVoiceMutation.mutate()}
      />

      <NoiseFilterCompareDialog
        open={denoisePreviewOpen}
        sourceAudioUrl={enrollAudioUrl}
        sourceFileName={`${detail?.name || "voice-sample"}.wav`}
        filteredFile={filteredEnrollAudioFile}
        isPreviewPending={denoisePreviewMutation.isPending}
        isApplying={denoiseEnrollAudioMutation.isPending}
        onOpenChange={(nextOpen) => {
          setDenoisePreviewOpen(nextOpen);
          if (!nextOpen) {
            setFilteredEnrollAudioFile(null);
          }
        }}
        onUseSourceAudio={() => {
          setFilteredEnrollAudioFile(null);
          setDenoisePreviewOpen(false);
        }}
        onUseFilteredAudio={() => setConfirmDenoiseOpen(true)}
        onDownloadSourceAudio={() =>
          void downloadEnrollAudio(
            enrollAudioUrl,
            `${detail?.name || "voice-sample"}.wav`,
          )
        }
        onDownloadFilteredAudio={() =>
          downloadFilteredAudio(
            `${detail?.name || "voice-sample"}-filtered.wav`,
          )
        }
      />

      <ConfirmDenoiseDialog
        open={confirmDenoiseOpen}
        isPending={denoiseEnrollAudioMutation.isPending}
        onOpenChange={setConfirmDenoiseOpen}
        onConfirm={() => denoiseEnrollAudioMutation.mutate()}
      />

      <VoiceTranscriptDialog {...speechToTextDialog.dialogProps} />
    </>
  );
}
