import { Languages, LoaderCircle, Trash2, XCircle } from "lucide-react";
import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ProcessingStep } from "@/utils";
import { CopyFeedbackButton } from "./copy-feedback-button";
import { TranslationProgressChip } from "./translation-progress-chip";

interface TranslateSourceTextPanelProps {
  containerRef: RefObject<HTMLDivElement | null>;
  handleTextareaScroll: () => void;
  hasSourceText: boolean;
  isAudio: boolean;
  isBusy: boolean;
  isJumpVisible: boolean;
  pauseAutoScroll: () => void;
  processingStep: ProcessingStep;
  readOnly?: boolean;
  resumeAutoScroll: () => void;
  showTranslateActions?: boolean;
  sourceText: string;
  title?: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  translateProgress: number;
  visibleIsLoadingAudio: boolean;
  onCancelTranslate: () => void;
  onClear: () => void;
  onCopy: () => boolean | Promise<boolean>;
  onSourceTextChange: (value: string) => void;
  onTranslate: () => void;
}

export function TranslateSourceTextPanel({
  containerRef,
  handleTextareaScroll,
  hasSourceText,
  isAudio,
  isBusy,
  isJumpVisible,
  pauseAutoScroll,
  processingStep,
  readOnly,
  resumeAutoScroll,
  showTranslateActions = true,
  sourceText,
  title = "Văn bản nguồn",
  textareaRef,
  translateProgress,
  visibleIsLoadingAudio,
  onCancelTranslate,
  onClear,
  onCopy,
  onSourceTextChange,
  onTranslate,
}: TranslateSourceTextPanelProps) {
  return (
    <Card ref={containerRef} className="translation-surface">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          {title}
          <div className="shrink-0 border-l border-l-gray-200 pl-2 text-right text-sm text-muted-foreground">
            {sourceText.length} ký tự
          </div>
        </CardTitle>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={!hasSourceText || isBusy}
            onClick={onClear}
          >
            <Trash2 className="mr-2 size-4" />
            Xóa
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={sourceText}
            onChange={(event) => onSourceTextChange(event.target.value)}
            onFocus={pauseAutoScroll}
            onMouseEnter={pauseAutoScroll}
            onScroll={handleTextareaScroll}
            readOnly={readOnly ?? isBusy}
            placeholder="Nội dung trích xuất sẽ hiển thị tại đây."
            className="translation-textarea"
          />
          {processingStep !== "extracting" ? (
            <CopyFeedbackButton
              className="absolute right-4 bottom-4"
              disabled={!hasSourceText || isBusy}
              label="Sao chép văn bản nguồn"
              onCopy={onCopy}
            />
          ) : null}
          {visibleIsLoadingAudio ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md bg-gray-50 p-6 text-center text-sm text-muted-foreground">
              <LoaderCircle className="size-8 animate-spin text-primary-500" />
              <span>Đang tải audio...</span>
            </div>
          ) : null}
          {processingStep === "extracting" ? (
            <TranslationProgressChip
              label={`${
                isAudio ? "Đang nhận dạng audio" : "Đang trích xuất"
              }... ${translateProgress}%`}
              jumpVisible={isJumpVisible}
              jumpLabel="Đi tới đoạn OCR mới nhất"
              onJump={resumeAutoScroll}
            />
          ) : null}
        </div>
        {showTranslateActions ? (
          <div className="flex justify-end gap-2">
            {processingStep === "translating" ? (
              <Button
                className="w-fit"
                type="button"
                variant="outline"
                onClick={onCancelTranslate}
              >
                <XCircle className="mr-2 size-4" />
                Hủy dịch
              </Button>
            ) : null}
            <Button
              className="w-fit"
              type="button"
              disabled={!hasSourceText || isBusy}
              onClick={onTranslate}
            >
              {processingStep === "translating" ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <Languages className="mr-2 size-4" />
              )}
              {processingStep === "translating"
                ? `Đang dịch... ${translateProgress}%`
                : "Dịch văn bản"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
