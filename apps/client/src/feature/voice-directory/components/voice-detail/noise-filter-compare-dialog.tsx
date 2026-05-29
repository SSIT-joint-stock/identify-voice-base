import { ArrowRight, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VoiceAudioPlayer } from "@/feature/voice/components/voice-audio-player";

interface NoiseFilterCompareDialogProps {
  open: boolean;
  sourceAudioUrl: string | null;
  sourceFileName: string;
  filteredFile: File | null;
  isPreviewPending: boolean;
  isApplying: boolean;
  onOpenChange: (open: boolean) => void;
  onUseSourceAudio: () => void;
  onUseFilteredAudio: () => void;
  onDownloadSourceAudio: () => void;
  onDownloadFilteredAudio: () => void;
}

export function NoiseFilterCompareDialog({
  open,
  sourceAudioUrl,
  sourceFileName,
  filteredFile,
  isPreviewPending,
  isApplying,
  onOpenChange,
  onUseSourceAudio,
  onUseFilteredAudio,
  onDownloadSourceAudio,
  onDownloadFilteredAudio,
}: NoiseFilterCompareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>So sánh audio đăng ký</DialogTitle>
          <DialogDescription>
            Nghe lại audio nguồn và audio đã lọc ồn trước khi quyết định cập
            nhật mẫu giọng đăng ký.
          </DialogDescription>
        </DialogHeader>

        <div className="relative grid gap-6 lg:grid-cols-2 lg:gap-12">
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden -translate-x-1/2 items-center justify-center lg:flex">
            <ArrowRight className="size-8 text-muted-foreground/80" />
          </div>

          <div className="space-y-4">
            <div className="space-y-4 rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Audio nguồn</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={!sourceAudioUrl}
                      aria-label="Tải audio nguồn"
                      onClick={onDownloadSourceAudio}
                    >
                      <Download className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Tải audio nguồn</TooltipContent>
                </Tooltip>
              </div>
              <VoiceAudioPlayer
                file={null}
                audioUrl={sourceAudioUrl}
                fileName={sourceFileName}
                title="Audio nguồn"
                compact
              />
            </div>
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={isApplying}
                onClick={onUseSourceAudio}
              >
                Dùng audio nguồn
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-4 rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Audio đã lọc ồn</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={!filteredFile || isPreviewPending}
                      aria-label="Tải audio đã lọc"
                      onClick={onDownloadFilteredAudio}
                    >
                      <Download className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Tải audio đã lọc</TooltipContent>
                </Tooltip>
              </div>
              {isPreviewPending ? (
                <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Đang lọc audio đăng ký...
                </div>
              ) : filteredFile ? (
                <VoiceAudioPlayer
                  file={filteredFile}
                  title="Audio đã lọc ồn"
                  compact
                />
              ) : (
                <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed px-4 text-center text-sm text-muted-foreground">
                  Không thể tạo audio đã lọc. Đóng dialog và thử lại.
                </div>
              )}
            </div>
            <div className="flex justify-center">
              <Button
                type="button"
                disabled={!filteredFile || isPreviewPending || isApplying}
                onClick={onUseFilteredAudio}
              >
                Dùng audio đã lọc
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
