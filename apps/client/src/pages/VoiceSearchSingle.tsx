import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVoiceStore } from "@/feature/voice";
import { voiceDirectoryApi } from "@/feature/voice-directory/api/voice-directory.api";
import { VoiceAudioPlayer } from "@/feature/voice/components/voice-audio-player";
import { VoiceEnrollDialog } from "@/feature/voice/components/voice-enroll-dialog";
import { VoiceErrorDialog } from "@/feature/voice/components/voice-error-dialog";
import { VoiceFilterNoiseDialog } from "@/feature/voice/components/voice-filter-noise-dialog";
import {
  VoiceSingleSearchForm,
  type VoiceSingleSearchFormHandle,
} from "@/feature/voice/components/voice-single-search-form";
import { VoiceTop5MatchTable } from "@/feature/voice/components/voice-top5-match-table";
import { VoiceTranscriptDialog } from "@/feature/voice/components/voice-transcript-dialog";
import { useVoiceSpeechToTextDialog } from "@/feature/voice/hooks/use-voice-speech-to-text-dialog";
import type {
  VoiceIdentifyItem,
  VoiceIdentifyTwoItem,
} from "@/feature/voice/types/voice.types";
import { useScrollOffset } from "@/hooks/use-scroll-offset";
import type { ApiError } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const SINGLE_SEARCH_FORM_ID = "voice-single-search-form";
const RESULT_SCROLL_OFFSET_Y = 96;

function getDeleteVoiceId(item: VoiceIdentifyItem | null) {
  return item?.matched_voice_id || item?.voice_id || "";
}

function getDeleteKey(item: VoiceIdentifyItem | null) {
  return item?.user_id || getDeleteVoiceId(item);
}

export default function VoiceSearchSingle() {
  const {
    identifyResult,
    errorDialog,
    closeErrorDialog,
    resetIdentifyResult,
    setIdentifyResult,
  } = useVoiceStore();

  const searchFormRef = useRef<VoiceSingleSearchFormHandle | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [normalizedAudioFile, setNormalizedAudioFile] = useState<File | null>(
    null,
  );
  const [openEnrollDialog, setOpenEnrollDialog] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRegisterItem, setSelectedRegisterItem] =
    useState<VoiceIdentifyItem | null>(null);
  const [selectedRegisterIndex, setSelectedRegisterIndex] = useState<
    number | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<VoiceIdentifyItem | null>(
    null,
  );
  const speechToTextDialog = useVoiceSpeechToTextDialog();
  const { targetRef: resultSectionRef } = useScrollOffset<HTMLDivElement>({
    offsetY: RESULT_SCROLL_OFFSET_Y,
    scrollKey: identifyResult,
  });

  useEffect(() => {
    resetIdentifyResult();
    return () => {
      resetIdentifyResult();
    };
  }, [resetIdentifyResult]);

  const items = identifyResult?.items ?? [];
  const hasAudioFile = Boolean(audioFile);
  const hasSearchResult = identifyResult !== null;
  const refreshIdentify = () => {
    searchFormRef.current?.submitCurrent();
  };

  const handleOpenTranscript = async (
    item?: VoiceIdentifyItem,
    rowKey = "single-audio",
  ) => {
    if (!audioFile) {
      toast.error("Chưa có audio để chạy S2T.");
      return;
    }

    speechToTextDialog.runFile({
      file: audioFile,
      key: rowKey,
      title: `Nội dung ghi âm - ${item?.name?.trim() || "Audio tra cứu"}`,
      loadingText: "Đang tải nội dung ghi âm...",
      backgroundMessage: "Đang chạy S2T audio tra cứu trong nền...",
      successMessage: "Đã xử lý xong nội dung ghi âm.",
    });
  };

  const deleteVoiceMutation = useMutation({
    mutationFn: async (target: VoiceIdentifyItem) => {
      if (target.user_id) {
        await voiceDirectoryApi.deleteVoice(target.user_id);
        return "business";
      }

      const voiceId = getDeleteVoiceId(target);
      if (!voiceId) {
        throw new Error("Thiếu voice_id để xóa trong AI Core.");
      }

      await voiceDirectoryApi.deleteAiCoreVoice(voiceId);
      return "ai-core";
    },
    onSuccess: (source) => {
      toast.success(
        source === "ai-core"
          ? "Đã xóa voice khỏi cơ sở dữ liệu AI Core."
          : "Đã xóa hồ sơ giọng nói.",
      );
      setDeleteTarget(null);
      refreshIdentify();
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as ApiError).message)
          : "Không thể xóa hồ sơ.";
      toast.error(msg);
    },
  });

  const openRegisterDialog = (item?: VoiceIdentifyItem) => {
    if (!item) {
      setSelectedRegisterItem(null);
      setSelectedRegisterIndex(null);
      setOpenEnrollDialog(true);
      return;
    }

    const nextIndex = items.findIndex(
      (candidate) =>
        candidate === item ||
        (!!candidate.matched_voice_id &&
          candidate.matched_voice_id === item.matched_voice_id) ||
        (!!candidate.voice_id && candidate.voice_id === item.voice_id) ||
        (!!candidate.user_id && candidate.user_id === item.user_id) ||
        (candidate.name === item.name && candidate.score === item.score),
    );

    setSelectedRegisterItem(item);
    setSelectedRegisterIndex(nextIndex >= 0 ? nextIndex : null);
    setOpenEnrollDialog(true);
  };

  const handleEnrollSuccess = (data: VoiceIdentifyTwoItem) => {
    if (!identifyResult || selectedRegisterIndex === null) {
      return;
    }

    const nextItems = [...identifyResult.items];
    nextItems[selectedRegisterIndex] = data;

    setIdentifyResult({
      ...identifyResult,
      items: nextItems,
    });
  };

  const handleSelectPreviewAudio = (file: File) => {
    setAudioFile(file);
    setSelectedRegisterItem(null);
    setSelectedRegisterIndex(null);
    setDeleteTarget(null);
    resetIdentifyResult();
    searchFormRef.current?.replaceAudioFile(file);
    searchFormRef.current?.submitCurrent();
  };

  return (
    <>
      <PageLayout
        title="Tra cứu 1 người"
        description="Tải file audio có 1 người nói để tra cứu"
        titleClassName="font-playfair text-[34px] leading-[1.1] font-bold tracking-tight text-[#4b1d18] md:text-[42px]"
      >
        <VoiceSingleSearchForm
          ref={searchFormRef}
          formId={SINGLE_SEARCH_FORM_ID}
          autoSubmitOnAudioChange
          showSubmitButton={false}
          onPendingChange={setIsSearching}
          onFileSelected={(file) => {
            setAudioFile(file);
            setNormalizedAudioFile(file);
            setSelectedRegisterItem(null);
            setSelectedRegisterIndex(null);
            setDeleteTarget(null);
            resetIdentifyResult();
          }}
        />

        <VoiceAudioPlayer
          file={audioFile}
          title="Audio tra cứu"
          footerAction={
            <div className="flex flex-wrap justify-end gap-3">
              <VoiceFilterNoiseDialog
                sourceFile={normalizedAudioFile}
                onSelectAudio={handleSelectPreviewAudio}
              />
              <Button
                type="submit"
                form={SINGLE_SEARCH_FORM_ID}
                variant="outline"
                className="shadow-md hover:shadow-lg"
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                    Đang tra cứu...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 size-4" />
                    Tra cứu 1 người
                  </>
                )}
              </Button>
            </div>
          }
        />

        {hasSearchResult ? (
          <div ref={resultSectionRef} className="space-y-3">
            <VoiceTop5MatchTable
              title="Kết quả phù hợp"
              description="Sắp xếp theo điểm số giảm dần."
              items={items}
              emptyText="Chưa có kết quả nhận diện."
              fallbackAudioFile={audioFile}
              onRegisterItem={openRegisterDialog}
              onDeleteItem={setDeleteTarget}
              onResultsChange={refreshIdentify}
              onOpenTranscript={(item, rowKey) =>
                void handleOpenTranscript(item, rowKey)
              }
              transcribingItemKey={speechToTextDialog.runningKey}
              deletingUserId={
                deleteVoiceMutation.isPending
                  ? getDeleteKey(deleteTarget)
                  : null
              }
            />
          </div>
        ) : null}

        {hasAudioFile ? (
          <div className="rounded-2xl border border-dashed p-5">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-semibold">
                {items.length > 0
                  ? "Các kết quả bên trên chưa đúng người?"
                  : "Đăng ký giọng nói từ file hiện tại"}
              </p>
              <Button
                type="button"
                variant="outline"
                className="shrink-0 shadow-lg hover:shadow-xl"
                onClick={() => openRegisterDialog()}
              >
                Đăng ký giọng nói
              </Button>
            </div>
          </div>
        ) : null}
      </PageLayout>

      <VoiceEnrollDialog
        open={openEnrollDialog}
        onOpenChange={(open) => {
          setOpenEnrollDialog(open);
          if (!open) {
            setSelectedRegisterItem(null);
            setSelectedRegisterIndex(null);
          }
        }}
        sourceFile={audioFile}
        speakerItem={selectedRegisterItem as VoiceIdentifyTwoItem | null}
        onEnrollSuccess={handleEnrollSuccess}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteVoiceMutation.isPending) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {deleteTarget?.user_id
                ? "Xóa hồ sơ giọng nói?"
                : "Xóa voice trong AI Core?"}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.user_id
                ? deleteTarget.name
                  ? `Bạn sắp xóa hồ sơ của ${deleteTarget.name}. Thao tác này sẽ gọi API xóa trên backend và gỡ hồ sơ khỏi nhận dạng mới.`
                  : "Bạn sắp xóa hồ sơ giọng nói này. Thao tác này sẽ gọi API xóa trên backend và gỡ hồ sơ khỏi nhận dạng mới."
                : deleteTarget?.name
                  ? `Bạn sắp xóa voice ${deleteTarget.name} trong cơ sở dữ liệu của AI Core. Voice này chưa có hồ sơ trong database nghiệp vụ.`
                  : "Bạn sắp xóa voice này trong cơ sở dữ liệu của AI Core. Voice này chưa có hồ sơ trong database nghiệp vụ."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={deleteVoiceMutation.isPending}
              onClick={() => setDeleteTarget(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!deleteTarget || deleteVoiceMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteVoiceMutation.mutate(deleteTarget);
                }
              }}
            >
              {deleteVoiceMutation.isPending ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VoiceErrorDialog
        open={errorDialog.open}
        title={errorDialog.title}
        description={errorDialog.description}
        onClose={closeErrorDialog}
      />

      <VoiceTranscriptDialog {...speechToTextDialog.dialogProps} />
    </>
  );
}
