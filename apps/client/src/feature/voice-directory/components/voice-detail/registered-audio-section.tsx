import { Loader2, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VoiceAudioPlayer } from "@/feature/voice/components/voice-audio-player";

interface RegisteredAudioSectionProps {
  audioUrl: string | null;
  fileName: string;
  isDenoising: boolean;
  isTranscribing?: boolean;
  onOpenDenoisePreview: () => void;
  onOpenDuplicateDialog: () => void;
  onOpenTranscript?: () => void;
}

export function RegisteredAudioSection({
  audioUrl,
  fileName,
  isDenoising,
  isTranscribing = false,
  onOpenDenoisePreview,
  onOpenDuplicateDialog,
  onOpenTranscript,
}: RegisteredAudioSectionProps) {
  const hasAudio = Boolean(audioUrl);

  return (
    <>
      <section className="space-y-3 rounded-xl">
        <h3 className="text-sm font-semibold">Mẫu giọng đăng ký</h3>
        {hasAudio ? (
          <div className="flex flex-col gap-3">
            <VoiceAudioPlayer
              file={null}
              audioUrl={audioUrl}
              fileName={fileName}
              compact
              showDownload
              isTranscribing={isTranscribing}
              onOpenTranscript={onOpenTranscript}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Không có mẫu audio đăng ký.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-2 py-1 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={!hasAudio || isDenoising}
          onClick={onOpenDenoisePreview}
        >
          {isDenoising ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 size-4" />
          )}
          Lọc ồn audio đăng ký
        </Button>
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={!hasAudio}
          onClick={onOpenDuplicateDialog}
        >
          <Users className="mr-2 size-4" />
          Xem những hồ sơ có giọng trùng
        </Button>
      </div>
    </>
  );
}
