import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TRANSLATION_LANGUAGES } from "@/feature/translate/constants/translate.constants";
import type { VoiceSpeakerTranscript } from "@/feature/voice/types/voice.types";
import { Copy, Languages, LoaderCircle, MessageSquareText } from "lucide-react";
import { toast } from "sonner";

export interface VoiceTranscriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcript?: string | null;
  speakerTranscripts?: VoiceSpeakerTranscript[];
  detectedLanguage?: string | null;
  isLoading?: boolean;
  loadingText?: string;
  /** Tiêu đề hiện trong header. Mặc định: "Nội dung ghi âm (S2T)" */
  title?: string;
  /** Mô tả nhỏ bên dưới tiêu đề. */
  description?: string;
}

function getLanguageLabel(code?: string | null): string {
  if (!code) return "Chưa phát hiện";
  const normalized = code.toLowerCase().split("-")[0];
  const found = TRANSLATION_LANGUAGES.find(
    (lang) => lang.value.toLowerCase() === normalized,
  );
  return found ? found.label : code.toUpperCase();
}

export function VoiceTranscriptDialog({
  open,
  onOpenChange,
  transcript,
  speakerTranscripts,
  detectedLanguage,
  isLoading = false,
  loadingText = "Đang tải transcript...",
  title = "Nội dung ghi âm (S2T)",
  description,
}: VoiceTranscriptDialogProps) {
  const hasTranscript =
    typeof transcript === "string" && transcript.trim().length > 0;
  const visibleSpeakerTranscripts = speakerTranscripts ?? [];
  const hasSpeakerTranscripts = visibleSpeakerTranscripts.length > 0;
  const langLabel = getLanguageLabel(detectedLanguage);

  const handleCopy = async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;
    try {
      await navigator.clipboard.writeText(trimmedText);
      toast.success("Đã sao chép transcript.");
    } catch {
      toast.error("Không thể sao chép.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="size-5 text-primary" />
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        {/* Language badge */}
        <div className="flex items-center gap-2">
          <Languages className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Ngôn ngữ phát hiện:
          </span>
          <Badge
            variant={detectedLanguage ? "default" : "outline"}
            className="text-xs"
          >
            {langLabel}
          </Badge>
        </div>

        {/* Transcript content */}
        {isLoading ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-6">
            <LoaderCircle className="size-8 animate-spin text-violet-500" />
            <p className="text-sm text-muted-foreground">{loadingText}</p>
          </div>
        ) : hasSpeakerTranscripts ? (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleSpeakerTranscripts.map((item, index) => (
              <div
                key={`${item.speaker_label ?? "speaker"}-${index}`}
                className="rounded-xl border bg-muted/30 p-1"
              >
                <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.title || `Người nói ${index + 1}`}
                    </p>
                    {item.speaker_label ? (
                      <p className="text-xs text-muted-foreground">
                        {item.speaker_label}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleCopy(item.text)}
                    disabled={!item.text.trim()}
                    aria-label={`Sao chép nội dung ${item.title || `người nói ${index + 1}`}`}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
                <div className="h-72 w-full overflow-y-auto rounded-lg pr-1">
                  <div className="p-4">
                    {item.text.trim() ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {item.text.trim()}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Chưa có nội dung transcript riêng cho người nói này.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : hasTranscript ? (
          <div className="relative rounded-xl border bg-muted/30 p-1">
            <div className="h-64 w-full overflow-y-auto rounded-lg pr-1">
              <div className="p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {transcript!.trim()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-6">
            <MessageSquareText className="size-8 text-slate-300" />
            <p className="text-sm text-muted-foreground">
              Không có nội dung transcript cho phiên này.
            </p>
            <p className="text-xs text-muted-foreground">
              S2T có thể thất bại hoặc audio quá ngắn/nhiễu.
            </p>
          </div>
        )}

        {/* Actions */}
        {hasTranscript && !hasSpeakerTranscripts ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleCopy(transcript!.trim())}
              className="gap-2"
            >
              <Copy className="size-3.5" />
              Sao chép
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
