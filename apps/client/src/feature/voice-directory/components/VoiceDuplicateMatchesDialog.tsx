import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QUERY_KEYS } from "@/constants";
import { voiceApi } from "@/feature/voice/api/voice.api";
import { VoiceAudioPlayer } from "@/feature/voice/components/voice-audio-player";
import { VoiceEnrollDialog } from "@/feature/voice/components/voice-enroll-dialog";
import { VoiceTop5MatchTable } from "@/feature/voice/components/voice-top5-match-table";
import { useNormalizeAudio } from "@/feature/voice/hooks/use-normalize-audio";
import type {
  VoiceIdentifyItem,
  VoiceIdentifyTwoItem,
} from "@/feature/voice/types/voice.types";
import type { ApiError } from "@/types";

import { voiceDirectoryApi } from "../api/voice-directory.api";

interface VoiceDuplicateMatchesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audioUrl: string | null;
  currentUserId?: string | null;
  currentVoiceId?: string | null;
  currentName?: string | null;
}

function normalizeId(value?: string | null) {
  return value?.trim() || "";
}

function getItemVoiceId(item: VoiceIdentifyItem) {
  return normalizeId(item.matched_voice_id) || normalizeId(item.voice_id);
}

function isCurrentSpeaker(
  item: VoiceIdentifyItem,
  currentUserId?: string | null,
  currentVoiceId?: string | null,
) {
  const userId = normalizeId(currentUserId);
  const voiceId = normalizeId(currentVoiceId);
  const itemUserId = normalizeId(item.user_id);
  const itemVoiceId = getItemVoiceId(item);

  return Boolean(
    (userId && itemUserId === userId) || (voiceId && itemVoiceId === voiceId),
  );
}

function getFileNameFromUrl(audioUrl: string, currentName?: string | null) {
  const trimmedName = currentName?.trim();
  const fallbackName = trimmedName
    ? `${trimmedName.replace(/\.[^.]+$/, "")}.wav`
    : "voice-sample.wav";

  if (trimmedName) {
    return fallbackName;
  }

  try {
    const parsed = new URL(audioUrl, window.location.origin);
    const fileName = decodeURIComponent(
      parsed.pathname.split("/").filter(Boolean).pop() || "",
    );
    return fileName || fallbackName;
  } catch {
    return fallbackName;
  }
}

function getAudioMimeType(blob: Blob) {
  return blob.type.startsWith("audio/") ? blob.type : "audio/wav";
}

export function VoiceDuplicateMatchesDialog({
  open,
  onOpenChange,
  audioUrl,
  currentUserId,
  currentVoiceId,
  currentName,
}: VoiceDuplicateMatchesDialogProps) {
  const queryClient = useQueryClient();
  const { fetchProtectedAudioBlob } = useNormalizeAudio();
  const [items, setItems] = useState<VoiceIdentifyItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<VoiceIdentifyItem | null>(
    null,
  );
  const [openEnrollDialog, setOpenEnrollDialog] = useState(false);
  const [selectedRegisterItem, setSelectedRegisterItem] =
    useState<VoiceIdentifyItem | null>(null);
  const [selectedRegisterIndex, setSelectedRegisterIndex] = useState<
    number | null
  >(null);
  const [sampleAudioFile, setSampleAudioFile] = useState<File | null>(null);

  const searchMutation = useMutation({
    mutationFn: async () => {
      if (!audioUrl?.trim()) {
        throw new Error("Hồ sơ này chưa có audio đăng ký để tra cứu.");
      }

      const blob = await fetchProtectedAudioBlob(audioUrl);
      const fileName = getFileNameFromUrl(audioUrl, currentName);
      const file = new File([blob], fileName, {
        type: getAudioMimeType(blob),
        lastModified: Date.now(),
      });

      setSampleAudioFile(file);
      return voiceApi.identifyVoice({ file });
    },
    onSuccess: (data) => {
      const nextItems = data.items.filter(
        (item) => !isCurrentSpeaker(item, currentUserId, currentVoiceId),
      );

      setItems(nextItems);

      if (nextItems.length === 0) {
        toast.info("Không có hồ sơ giọng trùng khác.");
        return;
      }

      toast.success(`Tìm thấy ${nextItems.length} hồ sơ giọng trùng.`);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as ApiError).message)
          : "Không thể tra cứu giọng trùng.";
      toast.error(msg);
      setItems([]);
      setSampleAudioFile(null);
    },
  });

  const deleteVoiceMutation = useMutation({
    mutationFn: async (target: VoiceIdentifyItem) => {
      if (!target.user_id) {
        throw new Error("Thiếu user_id để xóa hồ sơ.");
      }

      await voiceDirectoryApi.deleteVoice(target.user_id);
    },
    onSuccess: (_, target) => {
      toast.success("Đã xóa hồ sơ giọng nói.");
      setItems((prev) =>
        prev.filter((item) => item.user_id !== target.user_id),
      );
      setDeleteTarget(null);
      void queryClient.invalidateQueries({
        queryKey: ["voice", "directory"],
      });
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.voice.directory.detail(currentUserId || ""),
      });
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as ApiError).message)
          : "Không thể xóa hồ sơ.";
      toast.error(msg);
    },
  });

  const searchDuplicateMatches = searchMutation.mutate;

  const openRegisterDialog = (item: VoiceIdentifyItem) => {
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
    if (selectedRegisterIndex === null) {
      return;
    }

    setItems((prev) => {
      const nextItems = [...prev];
      nextItems[selectedRegisterIndex] = data;
      return nextItems;
    });

    void queryClient.invalidateQueries({
      queryKey: ["voice", "directory"],
    });
  };

  useEffect(() => {
    if (!open) return;

    searchDuplicateMatches();
  }, [open, searchDuplicateMatches]);

  const isLoading = searchMutation.isPending;
  const sampleAudioFileName = useMemo(
    () =>
      audioUrl
        ? getFileNameFromUrl(audioUrl, currentName)
        : `${currentName?.trim() || "voice-sample"}.wav`,
    [audioUrl, currentName],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-[92vh] overflow-hidden p-0 sm:max-w-5xl xl:max-w-6xl">
          <div className="flex h-full min-h-0 min-w-0 flex-col">
            <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
              <DialogTitle>Xem những hồ sơ có giọng trùng</DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Audio mẫu</h3>
                  {audioUrl ? (
                    <VoiceAudioPlayer
                      file={null}
                      audioUrl={audioUrl}
                      fileName={sampleAudioFileName}
                      compact
                    />
                  ) : (
                    <div className="mx-auto flex w-full max-w-lg items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
                      <Info className="size-4 shrink-0" />
                      Không có audio mẫu để nghe.
                    </div>
                  )}
                </section>

                <div className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">
                    Những hồ sơ có giọng trùng
                  </h3>
                  {isLoading ? (
                    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-5 animate-spin" />
                      Đang tra cứu giọng trùng...
                    </div>
                  ) : items.length === 0 ? (
                    <div className="mx-auto flex w-full max-w-lg items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
                      <Info className="size-4 shrink-0" />
                      Không có hồ sơ giọng trùng khác.
                    </div>
                  ) : (
                    <VoiceTop5MatchTable
                      title="Những hồ sơ có giọng trùng"
                      description="Sắp xếp theo điểm số giảm dần."
                      items={items}
                      emptyText="Không có hồ sơ giọng trùng khác."
                      fallbackAudioFile={sampleAudioFile}
                      onDeleteItem={setDeleteTarget}
                      deletingUserId={
                        deleteVoiceMutation.isPending
                          ? (deleteTarget?.user_id ?? null)
                          : null
                      }
                      onRegisterItem={openRegisterDialog}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleteVoiceMutation.isPending) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Xóa hồ sơ giọng nói?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.name
                ? `Bạn sắp xóa hồ sơ của ${deleteTarget.name}.`
                : "Bạn sắp xóa hồ sơ giọng nói này."}
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

      <VoiceEnrollDialog
        open={openEnrollDialog}
        onOpenChange={(nextOpen) => {
          setOpenEnrollDialog(nextOpen);
          if (!nextOpen) {
            setSelectedRegisterItem(null);
            setSelectedRegisterIndex(null);
          }
        }}
        sourceFile={sampleAudioFile}
        speakerItem={selectedRegisterItem as VoiceIdentifyTwoItem | null}
        onEnrollSuccess={handleEnrollSuccess}
      />
    </>
  );
}
