import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { truncText } from "@/utils/trunc-text";
import { FileAudio, FileText, Image, Upload, X } from "lucide-react";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ACCEPTED_TRANSLATE_FILE_INPUT } from "../constants/translate.constants";
import type { SelectedTranslateFile } from "../types/translate.types";
import {
  formatFileSize,
  getTranslateFileKindLabel,
  validateTranslateFile,
} from "../utils/translate-file.utils";

interface TranslateFileDropzoneProps {
  value: SelectedTranslateFile | null;
  disabled?: boolean;
  onChange: (value: SelectedTranslateFile | null) => void;
  onValidationError?: (message: string | null) => void;
}

function hasFilePayload(
  event: Pick<DragEvent<HTMLDivElement>, "dataTransfer">,
) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function getFileIcon(kind: SelectedTranslateFile["kind"]) {
  if (kind === "audio") return FileAudio;
  if (kind === "image") return Image;
  return FileText;
}

export function TranslateFileDropzone({
  value,
  disabled = false,
  onChange,
  onValidationError,
}: TranslateFileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedFile = value?.file ?? null;
  const SelectedIcon = value ? getFileIcon(value.kind) : FileText;
  const visibleError = localError;

  const resetInputValue = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const setError = (message: string | null) => {
    setLocalError(message);
    onValidationError?.(message);
  };

  const applyFile = (file: File) => {
    try {
      const selected = validateTranslateFile(file);
      dragDepthRef.current = 0;
      setIsDragOver(false);
      setError(null);
      onChange(selected);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Tệp không hợp lệ.";
      setError(message);
      onChange(null);
    } finally {
      resetInputValue();
    }
  };

  const handlePickFile = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      resetInputValue();
      return;
    }

    applyFile(file);
  };

  const handleRemoveFile = () => {
    dragDepthRef.current = 0;
    setIsDragOver(false);
    setError(null);
    onChange(null);
    resetInputValue();
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFilePayload(event)) return;

    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFilePayload(event)) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFilePayload(event)) return;

    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFilePayload(event)) return;

    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;

    if (files.length > 1) {
      setError("Chỉ có thể xử lý một tệp mỗi lần.");
      onChange(null);
      return;
    }

    applyFile(files[0]);
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-dashed bg-card p-6 text-card-foreground transition-all duration-200",
        "hover:border-violet-300 hover:bg-violet-50/30",
        disabled && "cursor-not-allowed opacity-60",
        visibleError &&
          "border-destructive bg-destructive/5 hover:border-destructive hover:bg-destructive/5",
        isDragOver &&
          !disabled &&
          !visibleError &&
          "border-violet-400 bg-violet-50/80 shadow-[0_0_0_4px_rgba(167,139,250,0.16)]",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TRANSLATE_FILE_INPUT}
        className="hidden"
        disabled={disabled}
        onChange={handleFileChange}
      />

      {isDragOver && !disabled ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 rounded-[20px] border border-dashed border-violet-300 bg-violet-100/55"
        />
      ) : null}

      {!value ? (
        <div className="relative z-10 flex min-h-44 flex-col items-center justify-center gap-4 text-center">
          <div
            className={cn(
              "rounded-full border p-3 transition-colors duration-200",
              isDragOver
                ? "border-violet-300 bg-violet-100 text-violet-700"
                : "border-slate-200 bg-white",
            )}
          >
            <Upload className="size-5" />
          </div>

          <div className="space-y-1">
            <p
              className={cn(
                "text-sm font-semibold",
                isDragOver && "text-violet-700",
              )}
            >
              {isDragOver ? "Thả tệp vào đây" : "Kéo thả hoặc tải tệp lên"}
            </p>
            <p className="text-sm text-muted-foreground">
              Hỗ trợ audio, PDF, DOCX, TXT và ảnh
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handlePickFile}
            className={cn(
              "transition-colors",
              isDragOver &&
                "border-violet-300 bg-violet-100 text-violet-700 hover:bg-violet-100",
            )}
          >
            Chọn tệp
          </Button>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "rounded-full border p-3 transition-colors duration-200",
                isDragOver
                  ? "border-violet-300 bg-violet-100 text-violet-700"
                  : "border-slate-200 bg-white",
              )}
            >
              <SelectedIcon className="size-5" />
            </div>

            <div className="min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="truncate text-sm font-semibold">
                    {truncText(selectedFile?.name ?? "", {
                      maxLength: 72,
                      breakWord: true,
                    })}
                  </p>
                </TooltipTrigger>
                <TooltipContent>{selectedFile?.name}</TooltipContent>
              </Tooltip>

              <p className="text-sm text-muted-foreground">
                {getTranslateFileKindLabel(value.kind)} ·{" "}
                {formatFileSize(selectedFile?.size ?? 0)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={handlePickFile}
            >
              Đổi tệp
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={handleRemoveFile}
            >
              <X className="mr-2 size-4" />
              Xóa
            </Button>
          </div>
        </div>
      )}

      {visibleError ? (
        <p className="relative z-10 mt-4 text-sm font-medium text-destructive">
          {visibleError}
        </p>
      ) : null}
    </div>
  );
}
