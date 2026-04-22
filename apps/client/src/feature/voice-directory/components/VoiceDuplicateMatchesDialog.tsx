import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, Loader2, Play, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QUERY_KEYS } from "@/constants";
import { voiceApi } from "@/feature/voice/api/voice.api";
import { VoiceAudioPlayer } from "@/feature/voice/components/voice-audio-player";
import { useNormalizeAudio } from "@/feature/voice/hooks/use-normalize-audio";
import type { VoiceIdentifyItem } from "@/feature/voice/types/voice.types";
import { getVoiceScoreMeta } from "@/feature/voice/utils/voice-score";
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

interface AudioDialogState {
  audioUrl: string;
  fileName: string;
  personName: string;
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
  const fallbackName = `${currentName?.trim() || "voice-sample"}.wav`;

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

function getItemAudioUrl(item: VoiceIdentifyItem) {
  return item.audio_url || item.enroll_audio_url || undefined;
}

function getDisplayName(item: VoiceIdentifyItem, index: number) {
  return item.name?.trim() || `Người ${index + 1}`;
}

function formatGender(gender: VoiceIdentifyItem["gender"]) {
  if (gender === "MALE") return "Nam";
  if (gender === "FEMALE") return "Nữ";
  return "-";
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
  const [audioDialog, setAudioDialog] = useState<AudioDialogState | null>(null);

  const searchMutation = useMutation({
    mutationFn: async () => {
      if (!audioUrl?.trim()) {
        throw new Error("Hồ sơ này chưa có audio đăng ký để tra cứu.");
      }

      const blob = await fetchProtectedAudioBlob(audioUrl);
      const fileName = getFileNameFromUrl(audioUrl, currentName);
      const file = new File([blob], fileName, {
        type: blob.type || "audio/wav",
        lastModified: Date.now(),
      });

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

  useEffect(() => {
    if (!open) return;

    searchDuplicateMatches();
  }, [open, searchDuplicateMatches]);

  const isLoading = searchMutation.isPending;
  const filteredCurrentVoiceId = useMemo(
    () => normalizeId(currentVoiceId),
    [currentVoiceId],
  );
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
                    <div className="no-scrollbar overflow-x-auto rounded-md border">
                      <Table className="w-full table-fixed">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[6%] text-center">
                              STT
                            </TableHead>
                            <TableHead className="w-[8%] text-center">
                              Audio
                            </TableHead>
                            <TableHead className="w-[18%]">Họ và tên</TableHead>
                            <TableHead className="w-[10%] text-center">
                              Giới tính
                            </TableHead>
                            <TableHead className="w-[9%] text-center">
                              Độ tuổi
                            </TableHead>
                            <TableHead className="w-[15%] text-center">
                              CCCD
                            </TableHead>
                            <TableHead className="w-[13%] text-center">
                              SĐT
                            </TableHead>
                            <TableHead className="w-[10%] text-center">
                              Điểm số
                            </TableHead>
                            <TableHead className="w-[11%] text-center">
                              Thao tác
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, index) => {
                            const personName = getDisplayName(item, index);
                            const rowAudioUrl = getItemAudioUrl(item);
                            const scoreMeta = getVoiceScoreMeta(item.score);
                            const isCurrentVoice =
                              filteredCurrentVoiceId &&
                              getItemVoiceId(item) === filteredCurrentVoiceId;

                            return (
                              <TableRow
                                key={`duplicate-${getItemVoiceId(item) || item.user_id || index}`}
                              >
                                <TableCell className="text-center">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="text-center">
                                  {rowAudioUrl ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          size="icon-sm"
                                          variant="outline"
                                          className="size-8 rounded-full"
                                          onClick={() =>
                                            setAudioDialog({
                                              audioUrl: rowAudioUrl,
                                              fileName: `${personName}.wav`,
                                              personName,
                                            })
                                          }
                                          aria-label={`Phát audio của ${personName}`}
                                        >
                                          <Play className="size-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Phát audio của {personName}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="min-w-0">
                                  <div className="truncate font-medium">
                                    {personName}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {formatGender(item.gender)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {typeof item.age === "number" && item.age > 0
                                    ? item.age
                                    : "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.citizen_identification || "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.phone_number || "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span
                                    className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${scoreMeta.badgeClassName}`}
                                  >
                                    {typeof item.score === "number"
                                      ? item.score.toFixed(4)
                                      : "-"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        size="icon-sm"
                                        variant="destructive"
                                        className="size-8 rounded-full"
                                        disabled={
                                          !item.user_id ||
                                          isCurrentVoice ||
                                          deleteVoiceMutation.isPending
                                        }
                                        onClick={() => setDeleteTarget(item)}
                                        aria-label={`Xóa hồ sơ của ${personName}`}
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {!item.user_id
                                        ? "Chỉ xóa được hồ sơ đã đăng ký"
                                        : isCurrentVoice
                                          ? "Không thể xóa hồ sơ đang mở"
                                          : `Xóa hồ sơ của ${personName}`}
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
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

      <Dialog
        open={audioDialog !== null}
        onOpenChange={(nextOpen) => !nextOpen && setAudioDialog(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{audioDialog?.personName || "Phát audio"}</DialogTitle>
            <DialogDescription>
              {audioDialog
                ? `Phát audio của ${audioDialog.personName}`
                : "Audio player"}
            </DialogDescription>
          </DialogHeader>

          {audioDialog ? (
            <VoiceAudioPlayer
              file={null}
              audioUrl={audioDialog.audioUrl}
              fileName={audioDialog.fileName}
              title={`Audio của ${audioDialog.personName}`}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
