import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { voiceDirectoryApi } from "@/feature/voice-directory/api/voice-directory.api";
import type { ApiError } from "@/types";
import type {
  VoiceIdentifyItem,
  VoiceIdentifyTwoItem,
} from "../types/voice.types";
import { getVoiceScoreMeta } from "../utils/voice-score";
import { VoiceTop5MatchTable } from "./voice-top5-match-table";

interface VoiceSpeakerResultCardProps {
  title: string;
  item: VoiceIdentifyTwoItem;
  onRegisterUnknown: (item?: VoiceIdentifyItem) => void;
  onSelectSegment?: (start: number, end?: number) => void;
  speakerIndex?: number;
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isUnknownSpeaker(item: VoiceIdentifyTwoItem) {
  const message = (item.message || "").toLowerCase();
  const matchedId = (item.matched_voice_id || "").toString().trim();
  const hasNoId = !matchedId || matchedId === "0" || matchedId === "-1";

  return (
    hasNoId ||
    message.includes("no matching") ||
    message.includes("unknown") ||
    message.includes("not found") ||
    message.includes("chua tim thay") ||
    message.includes("khong tim thay") ||
    message.includes("không tìm thấy") ||
    message.includes("chưa tìm thấy")
  );
}

export function VoiceSpeakerResultCard({
  title,
  item,
  onRegisterUnknown,
  onSelectSegment,
  speakerIndex = 0,
}: VoiceSpeakerResultCardProps) {
  const [isTimestampOpen, setIsTimestampOpen] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<VoiceIdentifyItem | null>(
    null,
  );
  const isUnknown = isUnknownSpeaker(item);
  const isAiIdentity = !isUnknown && item.truth_source === "AI";
  const isRegisteredIdentity = !isUnknown && item.truth_source === "BUSINESS";
  const top5Items: VoiceIdentifyItem[] = isUnknown ? [] : [item];
  const scoreMeta = getVoiceScoreMeta(item.score);

  const deleteVoiceMutation = useMutation({
    mutationFn: async (target: VoiceIdentifyItem) => {
      if (!target.user_id) {
        throw new Error("Thiếu user_id để xóa hồ sơ.");
      }
      await voiceDirectoryApi.deleteVoice(target.user_id);
    },
    onSuccess: () => {
      toast.success("Đã xóa hồ sơ giọng nói.");
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as ApiError).message)
          : "Không thể xóa hồ sơ.";
      toast.error(msg);
    },
  });

  return (
    <>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{!isUnknown && item.name ? item.name : title}</CardTitle>
          <CardDescription>
            {!isUnknown && item.citizen_identification
              ? `CCCD: ${item.citizen_identification}`
              : item.message || "Chưa có thông tin CCCD"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {typeof item.score === "number" ? (
              <Badge
                variant="outline"
                className={`px-3 py-1 text-sm font-medium ${scoreMeta.badgeClassName}`}
              >
                {item.score.toFixed(4)}
              </Badge>
            ) : null}

            {typeof item.num_speakers === "number" ? (
              <Badge variant="destructive">
                num_speakers: {item.num_speakers}
              </Badge>
            ) : null}

            {isAiIdentity ? (
              <Badge variant="outline">
                Danh tính do AI định danh trước đó, chưa được đăng ký
              </Badge>
            ) : null}

            {isRegisteredIdentity ? (
              <Badge variant="default">
                Giọng nói trên đã được đăng ký cùng định danh
              </Badge>
            ) : null}
          </div>

          {item.audio_segment && item.audio_segment.length > 0 ? (
            <div className="space-y-2">
              <div
                className="flex w-fit cursor-pointer items-center gap-2 rounded-md transition-opacity hover:opacity-80"
                onClick={() => setIsTimestampOpen(!isTimestampOpen)}
              >
                <p className="text-sm font-medium">Thời gian xuất hiện</p>
                {isTimestampOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {isTimestampOpen ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {item.audio_segment.map((segment, index) => (
                    <Button
                      key={`${segment.start}-${segment.end}-${index}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onSelectSegment?.(segment.start, segment.end)
                      }
                    >
                      {formatSeconds(segment.start)} -{" "}
                      {formatSeconds(segment.end)}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {!isUnknown ? (
            <VoiceTop5MatchTable
              title="Kết quả"
              description=""
              items={top5Items}
              emptyText="Không có dữ liệu phù hợp"
              speakerIndex={speakerIndex}
              onRegisterItem={onRegisterUnknown}
              onDeleteItem={setDeleteTarget}
              deletingUserId={
                deleteVoiceMutation.isPending
                  ? (deleteTarget?.user_id ?? null)
                  : null
              }
            />
          ) : (
            <div className="rounded-2xl border border-dashed p-4">
              <p className="text-sm text-muted-foreground">
                Chưa tìm thấy người phù hợp
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-dashed p-5">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-semibold">
                {!isUnknown
                  ? "Kết quả trên chưa đúng người?"
                  : "Đăng ký giọng nói cho speaker này"}
              </p>
              <Button
                type="button"
                variant="outline"
                className="shrink-0 shadow-lg hover:shadow-xl"
                onClick={() => onRegisterUnknown(item)}
              >
                Đăng ký giọng nói
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <DialogTitle>Xóa hồ sơ giọng nói?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.name
                ? `Bạn sắp xóa hồ sơ của ${deleteTarget.name}. Thao tác này sẽ gọi API xóa trên backend và gỡ hồ sơ khỏi nhận dạng mới.`
                : "Bạn sắp xóa hồ sơ giọng nói này. Thao tác này sẽ gọi API xóa trên backend và gỡ hồ sơ khỏi nhận dạng mới."}
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
    </>
  );
}
