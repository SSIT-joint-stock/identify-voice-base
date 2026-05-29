import { Check, LoaderCircle } from "lucide-react";
import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ProcessingStep } from "@/utils";
import { CopyFeedbackButton } from "./copy-feedback-button";
import { TranslateDownloadDropdown } from "./translate-download-dropdown";
import { TranslationProgressChip } from "./translation-progress-chip";
import type { TranslateExportFormat } from "../api/translate.api";

interface TranslateOutputPanelProps {
  canEdit: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  exportingFormat: TranslateExportFormat | null;
  handleTextareaScroll: () => void;
  hasPendingEdit: boolean;
  hasTranslatedText: boolean;
  isBusy: boolean;
  isJumpVisible: boolean;
  isSavingEdit: boolean;
  outputTitle: string;
  pauseAutoScroll: () => void;
  processingStep: ProcessingStep;
  resumeAutoScroll: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  translatedText: string;
  translateProgress: number;
  onCopy: () => boolean | Promise<boolean>;
  onDownload: (format: TranslateExportFormat) => void;
  onSaveEdit: () => void;
  onTranslatedTextChange: (value: string) => void;
}

export function TranslateOutputPanel({
  canEdit,
  containerRef,
  exportingFormat,
  handleTextareaScroll,
  hasPendingEdit,
  hasTranslatedText,
  isBusy,
  isJumpVisible,
  isSavingEdit,
  outputTitle,
  pauseAutoScroll,
  processingStep,
  resumeAutoScroll,
  textareaRef,
  translatedText,
  translateProgress,
  onCopy,
  onDownload,
  onSaveEdit,
  onTranslatedTextChange,
}: TranslateOutputPanelProps) {
  return (
    <Card ref={containerRef} className="translation-surface">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{outputTitle}</CardTitle>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          {hasPendingEdit ? (
            <Button
              type="button"
              size="sm"
              disabled={isSavingEdit}
              onClick={onSaveEdit}
            >
              {isSavingEdit ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Lưu
            </Button>
          ) : null}

          <TranslateDownloadDropdown
            disabled={
              !hasTranslatedText ||
              isBusy ||
              Boolean(exportingFormat) ||
              hasPendingEdit ||
              isSavingEdit
            }
            exportingFormat={exportingFormat}
            onDownload={onDownload}
          />
        </div>
      </CardHeader>
      <CardContent>
        {translatedText || processingStep === "translating" ? (
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={translatedText}
              readOnly={!canEdit || isBusy || isSavingEdit}
              onChange={(event) => onTranslatedTextChange(event.target.value)}
              onFocus={pauseAutoScroll}
              onMouseEnter={pauseAutoScroll}
              onScroll={handleTextareaScroll}
              placeholder="Bản dịch sẽ hiển thị ở đây."
              className="translation-textarea rounded-md border bg-muted/30"
            />
            {processingStep !== "translating" ? (
              <CopyFeedbackButton
                className="absolute right-4 bottom-4"
                disabled={
                  !hasTranslatedText || isBusy || hasPendingEdit || isSavingEdit
                }
                label="Sao chép bản dịch"
                onCopy={onCopy}
              />
            ) : null}
            {processingStep === "translating" ? (
              <TranslationProgressChip
                label={`Đang dịch tiếp... ${translateProgress}%`}
                jumpVisible={isJumpVisible}
                jumpLabel="Đi tới đoạn dịch mới nhất"
                onJump={resumeAutoScroll}
              />
            ) : null}
          </div>
        ) : (
          <div className="translation-empty-state relative">
            Bản dịch sẽ hiển thị ở đây.
            <CopyFeedbackButton
              className="absolute right-4 bottom-4"
              disabled
              label="Sao chép bản dịch"
              onCopy={onCopy}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
