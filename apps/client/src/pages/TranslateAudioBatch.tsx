import {
  ChevronDown,
  Files,
  FolderOpen,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Upload,
} from "lucide-react";

import { PageLayout } from "@/components/PageLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TranslateOutputPanel } from "@/feature/translate/components/translate-output-panel";
import { TranslateSourceTextPanel } from "@/feature/translate/components/translate-source-text-panel";
import {
  AUTO_LANGUAGE,
  OCR_LANGUAGES,
  SPEECH_LANGUAGES,
  TRANSLATION_LANGUAGES,
} from "@/feature/translate/constants/translate.constants";
import {
  ACCEPTED_BATCH_EXTENSIONS,
  copyTranslateBatchText,
  useTranslateBatchController,
} from "@/feature/translate/hooks/use-translate-batch-controller";
import { useBeforeUnloadGuard } from "@/hooks/use-before-unload-guard";
import { cn } from "@/lib/utils";
import { getBatchStatusLabel, getStatusLabel } from "@/utils";

function normalizeDisplayFileName(filename: string) {
  if (!/[ÃÂÄÅÆáºá»]/.test(filename)) return filename;

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(filename, (char) => char.charCodeAt(0)),
    );
  } catch {
    return filename;
  }
}

export default function TranslateAudioBatch() {
  const {
    batch,
    createBatch,
    errorMessage,
    exportItem,
    exportingFormat,
    fileInputRef,
    files,
    folderInputRef,
    handleFilesChange,
    isBatchRunning,
    isCreating,
    pickerDropdown,
    refreshBatch,
    resetPage,
    retryItem,
    retryOptions,
    selectedItem,
    selectedItemBusy,
    selectedItemId,
    selectedProcessingStep,
    selectedSourceText,
    selectedTranslatedText,
    setSelectedItemId,
    sourceAutoScroll,
    translatedAutoScroll,
    updateFileOption,
    updateRetryOption,
  } = useTranslateBatchController();

  useBeforeUnloadGuard({ enabled: isCreating || isBatchRunning });

  return (
    <PageLayout
      title="Dịch lô file"
      description="Chọn nhiều file âm thanh, PDF, Word hoặc ảnh để dịch tự động và theo dõi kết quả dễ dàng."
      titleClassName="translation-page-title"
      onRefresh={resetPage}
      moreButtons={
        <>
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept={ACCEPTED_BATCH_EXTENSIONS}
            multiple
            onChange={(event) => handleFilesChange(event.target.files)}
          />
          <input
            ref={folderInputRef}
            className="hidden"
            type="file"
            accept={ACCEPTED_BATCH_EXTENSIONS}
            multiple
            onChange={(event) => handleFilesChange(event.target.files)}
          />
          <Popover
            open={pickerDropdown.open}
            onOpenChange={pickerDropdown.setOpen}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size={"sm"}
                className="justify-between"
                disabled={isCreating || isBatchRunning}
              >
                <Files className="mr-2 size-4" />
                Chọn file
                <ChevronDown className="ml-2 size-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-48 p-1"
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  className="flex h-9 items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                  onClick={() => pickerDropdown.selectAction("files")}
                >
                  <Files className="size-4 text-slate-500" />
                  Chọn nhiều file
                </button>
                <button
                  type="button"
                  className="flex h-9 items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                  onClick={() => pickerDropdown.selectAction("folder")}
                >
                  <FolderOpen className="size-4 text-slate-500" />
                  Chọn thư mục
                </button>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            disabled={!files.length || isCreating || isBatchRunning}
            onClick={() => void createBatch()}
          >
            {isCreating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Bắt đầu xử lý {files.length} file
          </Button>
        </>
      }
    >
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Không thể xử lý yêu cầu</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-1">
        <Card className="translation-surface">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Danh sách file</CardTitle>
              <p className="text-sm text-muted-foreground">
                {batch
                  ? `${batch.completed_items}/${batch.total_items} hoàn tất`
                  : `${files.length} file đã chọn`}
              </p>
            </div>
            {batch ? (
              <Badge
                variant={batch.status === "failed" ? "destructive" : "outline"}
              >
                {getBatchStatusLabel(batch.status)}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            {batch
              ? batch.items.map((item) => (
                  <div
                    key={item.item_id}
                    className={cn(
                      "min-w-80 flex-1 space-y-3 rounded-md border p-3 text-left transition-colors",
                      selectedItemId === item.item_id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted",
                    )}
                    onClick={() => setSelectedItemId(item.item_id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate font-medium">
                        {normalizeDisplayFileName(item.filename)}
                      </span>
                      <Badge
                        variant={
                          item.status === "failed" ? "destructive" : "secondary"
                        }
                        className="shrink-0"
                      >
                        {getStatusLabel(item.status)}
                      </Badge>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="min-w-52 flex-1 space-y-2">
                        <Label>Ngôn ngữ nguồn</Label>
                        <Combobox
                          value={
                            retryOptions[item.item_id]?.sourceLang ??
                            item.source_lang ??
                            AUTO_LANGUAGE
                          }
                          onValueChange={(value) =>
                            updateRetryOption(item.item_id, {
                              sourceLang: value,
                            })
                          }
                          options={
                            item.source_file_type === "audio"
                              ? SPEECH_LANGUAGES
                              : OCR_LANGUAGES
                          }
                          disabled={
                            item.status === "extracting" ||
                            item.status === "transcribing" ||
                            item.status === "translating"
                          }
                          searchPlaceholder="Tìm ngôn ngữ nguồn..."
                          emptyMessage="Không tìm thấy ngôn ngữ nguồn"
                        />
                      </div>

                      <div className="min-w-52 flex-1 space-y-2">
                        <Label>Dịch sang</Label>
                        <Combobox
                          value={
                            retryOptions[item.item_id]?.targetLang ??
                            item.target_lang
                          }
                          onValueChange={(value) =>
                            updateRetryOption(item.item_id, {
                              targetLang: value,
                            })
                          }
                          options={TRANSLATION_LANGUAGES}
                          disabled={
                            item.status === "extracting" ||
                            item.status === "transcribing" ||
                            item.status === "translating"
                          }
                          searchPlaceholder="Tìm ngôn ngữ dịch..."
                          emptyMessage="Không tìm thấy ngôn ngữ dịch"
                        />
                      </div>

                      {item.source_file_type === "audio" ? (
                        <>
                          <div className="w-48 space-y-2">
                            <Label>Timestamp</Label>
                            <Select
                              value={String(
                                retryOptions[item.item_id]?.returnTimestamp ??
                                  item.return_timestamp ??
                                  false,
                              )}
                              onValueChange={(value) =>
                                updateRetryOption(item.item_id, {
                                  returnTimestamp: value === "true",
                                })
                              }
                              disabled={
                                item.status === "extracting" ||
                                item.status === "transcribing" ||
                                item.status === "translating"
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="false">
                                  Không trả timestamp
                                </SelectItem>
                                <SelectItem value="true">
                                  Trả timestamp
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-40 space-y-2">
                            <Label>Khử nhiễu</Label>
                            <Select
                              value={String(
                                retryOptions[item.item_id]?.denoiseAudio ??
                                  item.denoise_audio ??
                                  false,
                              )}
                              onValueChange={(value) =>
                                updateRetryOption(item.item_id, {
                                  denoiseAudio: value === "true",
                                })
                              }
                              disabled={
                                item.status === "extracting" ||
                                item.status === "transcribing" ||
                                item.status === "translating"
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="false">
                                  Không khử nhiễu
                                </SelectItem>
                                <SelectItem value="true">Khử nhiễu</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              : files.map((file) => (
                  <div
                    key={file.id}
                    className="min-w-80 flex-1 space-y-3 rounded-md border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate font-medium">
                        {file.file.name}
                      </span>
                      <Badge variant="secondary" className="shrink-0">
                        {file.kind === "audio"
                          ? "Âm thanh"
                          : file.kind === "image"
                            ? "Ảnh"
                            : "Tài liệu"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                      <div className="min-w-60 flex-1 space-y-2">
                        <Label>Ngôn ngữ nguồn</Label>
                        <Combobox
                          value={file.sourceLang}
                          onValueChange={(value) =>
                            updateFileOption(file.id, { sourceLang: value })
                          }
                          options={
                            file.kind === "audio"
                              ? SPEECH_LANGUAGES
                              : OCR_LANGUAGES
                          }
                          disabled={isCreating || isBatchRunning}
                          searchPlaceholder="Tìm ngôn ngữ nguồn..."
                          emptyMessage="Không tìm thấy ngôn ngữ nguồn"
                        />
                      </div>

                      <div className="min-w-60 flex-1 space-y-2">
                        <Label>Dịch sang</Label>
                        <Combobox
                          value={file.targetLang}
                          onValueChange={(value) =>
                            updateFileOption(file.id, { targetLang: value })
                          }
                          options={TRANSLATION_LANGUAGES}
                          disabled={isCreating || isBatchRunning}
                          searchPlaceholder="Tìm ngôn ngữ dịch..."
                          emptyMessage="Không tìm thấy ngôn ngữ dịch"
                        />
                      </div>

                      {file.kind === "audio" ? (
                        <>
                          <div className="w-52 space-y-2">
                            <Label>Timestamp</Label>
                            <Select
                              value={String(file.returnTimestamp)}
                              onValueChange={(value) =>
                                updateFileOption(file.id, {
                                  returnTimestamp: value === "true",
                                })
                              }
                              disabled={isCreating || isBatchRunning}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="false">
                                  Không trả timestamp
                                </SelectItem>
                                <SelectItem value="true">
                                  Trả timestamp
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-44 space-y-2">
                            <Label>Khử nhiễu</Label>
                            <Select
                              value={String(file.denoiseAudio)}
                              onValueChange={(value) =>
                                updateFileOption(file.id, {
                                  denoiseAudio: value === "true",
                                })
                              }
                              disabled={isCreating || isBatchRunning}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="false">
                                  Không khử nhiễu
                                </SelectItem>
                                <SelectItem value="true">Khử nhiễu</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
          </CardContent>
        </Card>

        <Card className="translation-surface">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>
                {selectedItem
                  ? normalizeDisplayFileName(selectedItem.filename)
                  : "Preview bản dịch"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedItem
                  ? `${getStatusLabel(selectedItem.status)} · ${selectedItem.progress}%`
                  : "Chọn một file để xem transcript và bản dịch."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!batch}
                onClick={() => void refreshBatch()}
              >
                <RefreshCw className="size-4" />
                Cập nhật
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedItem ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 p-3">
                  <div className="flex items-center gap-2">
                    {selectedItem.status === "extracting" ||
                    selectedItem.status === "transcribing" ||
                    selectedItem.status === "translating" ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : (
                      <Play className="size-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">
                      {getStatusLabel(selectedItem.status)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {selectedItem.progress}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedItem.status === "failed" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void retryItem(selectedItem.item_id)}
                      >
                        <RotateCcw className="size-4" />
                        Chạy lại
                      </Button>
                    ) : null}
                  </div>
                </div>

                {selectedItem.error ? (
                  <Alert variant="destructive">
                    <AlertTitle>Item xử lý lỗi</AlertTitle>
                    <AlertDescription>{selectedItem.error}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                  <TranslateSourceTextPanel
                    containerRef={sourceAutoScroll.containerRef}
                    handleTextareaScroll={sourceAutoScroll.handleTextareaScroll}
                    hasSourceText={selectedSourceText.trim().length > 0}
                    isAudio={selectedItem.source_file_type === "audio"}
                    isBusy={selectedItemBusy}
                    isJumpVisible={sourceAutoScroll.isJumpVisible}
                    pauseAutoScroll={sourceAutoScroll.pauseAutoScroll}
                    processingStep={selectedProcessingStep}
                    readOnly
                    resumeAutoScroll={sourceAutoScroll.resumeAutoScroll}
                    showTranslateActions={false}
                    sourceText={selectedSourceText}
                    textareaRef={sourceAutoScroll.textareaRef}
                    title="Nội dung nguồn"
                    translateProgress={selectedItem.progress}
                    visibleIsLoadingAudio={false}
                    onCancelTranslate={() => undefined}
                    onClear={() => undefined}
                    onCopy={() =>
                      copyTranslateBatchText(
                        selectedSourceText,
                        "Đã sao chép nội dung nguồn.",
                      )
                    }
                    onSourceTextChange={() => undefined}
                    onTranslate={() => undefined}
                  />

                  <TranslateOutputPanel
                    canEdit={false}
                    containerRef={translatedAutoScroll.containerRef}
                    exportingFormat={exportingFormat}
                    handleTextareaScroll={
                      translatedAutoScroll.handleTextareaScroll
                    }
                    hasPendingEdit={false}
                    hasTranslatedText={selectedTranslatedText.trim().length > 0}
                    isBusy={selectedItemBusy}
                    isJumpVisible={translatedAutoScroll.isJumpVisible}
                    isSavingEdit={false}
                    outputTitle="Bản dịch"
                    pauseAutoScroll={translatedAutoScroll.pauseAutoScroll}
                    processingStep={selectedProcessingStep}
                    resumeAutoScroll={translatedAutoScroll.resumeAutoScroll}
                    textareaRef={translatedAutoScroll.textareaRef}
                    translatedText={selectedTranslatedText}
                    translateProgress={selectedItem.progress}
                    onCopy={() =>
                      copyTranslateBatchText(
                        selectedTranslatedText,
                        "Đã sao chép bản dịch.",
                      )
                    }
                    onDownload={(format) =>
                      void exportItem(selectedItem, format)
                    }
                    onSaveEdit={() => undefined}
                    onTranslatedTextChange={() => undefined}
                  />
                </div>
              </>
            ) : (
              <div className="flex min-h-90 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                Chưa có batch để preview.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
