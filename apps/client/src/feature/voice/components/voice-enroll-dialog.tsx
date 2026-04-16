import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { truncText } from "@/utils/trunc-text";
import { useMemo } from "react";
import type { VoiceIdentifyTwoItem } from "../types/voice.types";
import { VoiceUploadForm } from "./voice-upload-form";

interface VoiceEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceFile: File | null;
  speakerItem?: VoiceIdentifyTwoItem | null;
  onEnrollSuccess?: (data: VoiceIdentifyTwoItem) => void;
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getSourceFileKey(file: File | null) {
  if (!file) return "no-file";
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function getPreviewAudioUrl(
  item?: VoiceIdentifyTwoItem | null,
): string | undefined {
  return item?.audio_url?.trim() || undefined;
}

interface VoiceEnrollDialogContentProps {
  open: boolean;
  sourceFile: File | null;
  speakerItem?: VoiceIdentifyTwoItem | null;
  onEnrollSuccess?: (data: VoiceIdentifyTwoItem) => void;
  onOpenChange: (open: boolean) => void;
}

function VoiceEnrollDialogContent({
  open,
  sourceFile,
  speakerItem,
  onEnrollSuccess,
  onOpenChange,
}: VoiceEnrollDialogContentProps) {
  const previewAudioUrl = useMemo(
    () => getPreviewAudioUrl(speakerItem),
    [speakerItem],
  );

  // Only use file-based key for form, not segment-based (to prevent form reset when changing segment)
  const formKey = [
    speakerItem?.matched_voice_id ?? "new",
    getSourceFileKey(sourceFile),
  ].join("-");

  const segments = speakerItem?.audio_segment ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] overflow-hidden p-0 sm:max-w-5xl xl:max-w-6xl">
        <div className="flex h-full min-h-0 flex-col min-w-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
            <DialogTitle>Đăng ký giọng nói</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="min-w-0 space-y-4 ">
              {sourceFile ? (
                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="shrink-0">File nguồn:</span>
                    <span
                      className="min-w-0 flex-1 truncate  font-medium "
                      title={sourceFile.name}
                    >
                      {truncText(sourceFile.name, {
                        maxLength: 100,
                        breakWord: true,
                      })}
                    </span>
                  </div>
                </div>
              ) : null}

              {segments.length > 0 ? (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">
                    Các đoạn thời gian của người nói
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Thông tin tham khảo từ kết quả nhận dạng. Hệ thống không còn
                    cắt audio phía trên trên khi đăng ký.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {segments.map((segment, index) => {
                      return (
                        <span
                          key={`${segment.start}-${segment.end}-${index}`}
                          className={cn(
                            "inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground",
                          )}
                        >
                          {formatSeconds(segment.start)} -{" "}
                          {formatSeconds(segment.end)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <VoiceUploadForm
                key={formKey}
                initialFile={sourceFile}
                previewAudioUrl={previewAudioUrl}
                compact
                onUploadSuccess={(data) => {
                  if (data) {
                    onEnrollSuccess?.({
                      ...speakerItem,
                      ...data,
                    } as VoiceIdentifyTwoItem);
                  }

                  onOpenChange(false);
                }}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VoiceEnrollDialog({
  open,
  onOpenChange,
  sourceFile,
  speakerItem,
  onEnrollSuccess,
}: VoiceEnrollDialogProps) {
  // Use key to force VoiceEnrollDialogContent to remount when speaker changes
  const contentKey = speakerItem?.matched_voice_id ?? "no-speaker";

  return (
    <VoiceEnrollDialogContent
      key={contentKey}
      open={open}
      sourceFile={sourceFile}
      speakerItem={speakerItem}
      onEnrollSuccess={onEnrollSuccess}
      onOpenChange={onOpenChange}
    />
  );
}
