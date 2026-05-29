import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VoiceAudioPlayer } from "@/feature/voice/components/voice-audio-player";

import type {
  SessionDetailForAudio,
  VoiceIdentifyHistoryItem,
} from "../../types/voice-directory.types";

interface SessionAudioDialogProps {
  sessionId: string | null;
  historyRow: VoiceIdentifyHistoryItem | null;
  isLoading: boolean;
  sessionDetail?: SessionDetailForAudio;
  onOpenChange: (open: boolean) => void;
}

export function SessionAudioDialog({
  sessionId,
  historyRow,
  isLoading,
  sessionDetail,
  onOpenChange,
}: SessionAudioDialogProps) {
  return (
    <Dialog open={Boolean(sessionId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Audio đầu vào phiên nhận dạng</DialogTitle>
          <DialogDescription>
            {historyRow
              ? `Phiên ${historyRow.session_id.slice(0, 8)} • ${new Date(
                  historyRow.identified_at,
                ).toLocaleString("vi-VN")}`
              : "Nghe lại audio đầu vào của phiên nhận dạng."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Đang tải audio…
          </div>
        ) : sessionDetail?.audio_url && sessionId ? (
          <VoiceAudioPlayer
            file={null}
            audioUrl={sessionDetail.audio_url}
            fileName={`session-${sessionId.slice(0, 8)}.wav`}
            compact
            showDownload
          />
        ) : (
          <p className="text-sm text-destructive">
            Không lấy được URL phát phiên này.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
