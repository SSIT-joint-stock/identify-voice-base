import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ACCEPTED_AUDIO_TYPES, MAX_AUDIO_FILE_SIZE_BYTES } from "@/constants";
import { cn } from "@/lib/utils";
import { truncText } from "@/utils/trunc-text";
import { FileAudio, Mic, Square, Upload, X } from "lucide-react";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useAudioRecorder } from "../hooks/use-audio-recorder";

interface VoiceAudioDropzoneProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  error?: string;
}

const ACCEPTED_AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".m4a",
  ".webm",
  ".ogg",
  ".flac",
] as const;

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function hasFilePayload(
  event: Pick<DragEvent<HTMLDivElement>, "dataTransfer">,
) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function hasAcceptedAudioExtension(fileName: string) {
  const normalizedFileName = fileName.toLowerCase();
  return ACCEPTED_AUDIO_EXTENSIONS.some((extension) =>
    normalizedFileName.endsWith(extension),
  );
}

function validateAudioFile(file: File) {
  if (file.size <= 0) {
    return "File audio không hợp lệ.";
  }

  if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
    return `File audio không được vượt quá ${MAX_AUDIO_FILE_SIZE_BYTES / 1024 / 1024}MB.`;
  }

  const normalizedMimeType = file.type.toLowerCase();
  const isAcceptedMimeType = ACCEPTED_AUDIO_TYPES.includes(
    normalizedMimeType as (typeof ACCEPTED_AUDIO_TYPES)[number],
  );

  if (!isAcceptedMimeType && !hasAcceptedAudioExtension(file.name)) {
    return "Định dạng file audio chưa được hỗ trợ.";
  }

  return null;
}

export function VoiceAudioDropzone({
  value,
  onChange,
  disabled = false,
  label = "Kéo thả hoặc tải file audio",
  description = "Thả file từ File Explorer hoặc chọn mp3, wav, m4a, webm, ogg, flac",
  error,
}: VoiceAudioDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const { isRecording, duration, startRecording, stopRecording } =
    useAudioRecorder();

  const isInteractionDisabled = disabled || isRecording;
  const effectiveError = error || dropError;

  const resetInputValue = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const applySelectedFile = (file: File) => {
    const validationError = validateAudioFile(file);

    if (validationError) {
      setDropError(validationError);
      resetInputValue();
      return;
    }

    setDropError(null);
    dragDepthRef.current = 0;
    setIsDragOver(false);
    onChange(file);
    resetInputValue();
  };

  const handlePickFile = () => {
    if (isInteractionDisabled) return;
    dragDepthRef.current = 0;
    setIsDragOver(false);
    inputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    resetInputValue();

    if (!file) return;
    applySelectedFile(file);
  };

  const handleRemoveFile = () => {
    dragDepthRef.current = 0;
    setIsDragOver(false);
    setDropError(null);
    onChange(null);
    resetInputValue();
  };

  const handleToggleRecording = async () => {
    if (disabled) return;

    if (isRecording) {
      const file = await stopRecording();
      if (file) {
        applySelectedFile(file);
      }
      return;
    }

    try {
      dragDepthRef.current = 0;
      setIsDragOver(false);
      setDropError(null);
      await startRecording();
    } catch {
      // Permission denied or no mic
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (isInteractionDisabled || !hasFilePayload(event)) return;

    event.preventDefault();
    event.stopPropagation();

    dragDepthRef.current += 1;
    setIsDragOver(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isInteractionDisabled || !hasFilePayload(event)) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";

    if (!isDragOver) {
      setIsDragOver(true);
    }
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
    if (isInteractionDisabled || !hasFilePayload(event)) return;

    event.preventDefault();
    event.stopPropagation();

    dragDepthRef.current = 0;
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files ?? []);

    if (files.length === 0) return;

    if (files.length > 1) {
      setDropError("Chỉ có thể tải lên một file audio mỗi lần.");
      return;
    }

    applySelectedFile(files[0]);
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-dashed p-6 transition-all duration-200",
        "bg-card text-card-foreground",
        "hover:border-violet-300 hover:bg-violet-50/30",
        disabled && "cursor-not-allowed opacity-60",
        effectiveError &&
          "border-destructive bg-destructive/5 hover:bg-destructive/5",
        isRecording &&
          "border-red-400 bg-red-50/60 hover:border-red-400 hover:bg-red-50/60",
        isDragOver &&
          !isInteractionDisabled &&
          !effectiveError &&
          "border-violet-400 bg-violet-50/80 shadow-[0_0_0_4px_rgba(167,139,250,0.16)]",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac"
        className="hidden"
        onChange={handleFileChange}
        disabled={isInteractionDisabled}
      />

      {isDragOver && !isInteractionDisabled ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 rounded-[20px] border border-dashed border-violet-300 bg-violet-100/55"
        />
      ) : null}

      {isRecording ? (
        <div className="relative z-10 flex flex-col items-center justify-center gap-4 text-center">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex size-16 animate-ping rounded-full bg-red-400 opacity-30" />
            <span className="absolute inline-flex size-12 animate-pulse rounded-full bg-red-300 opacity-20" />
            <div className="relative z-10 flex size-14 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-200">
              <Mic className="size-6 text-white" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-red-700">Đang ghi âm...</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-red-600">
              {formatDuration(duration)}
            </p>
          </div>

          <Button
            type="button"
            variant="destructive"
            onClick={handleToggleRecording}
            className="gap-2"
          >
            <Square className="size-4" />
            Dừng ghi âm
          </Button>
        </div>
      ) : !value ? (
        <div className="relative z-10 flex flex-col items-center justify-center gap-4 text-center">
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
              {isDragOver ? "Thả file audio vào đây" : label}
            </p>
            <p className="text-sm text-muted-foreground">
              {isDragOver ? "Nhả chuột để dùng file này ngay." : description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handlePickFile}
              disabled={disabled}
              className={cn(
                "transition-colors",
                isDragOver &&
                  "border-violet-300 bg-violet-100 text-violet-700 hover:bg-violet-100",
              )}
            >
              Chọn file audio
            </Button>

            <span className="text-xs text-muted-foreground">hoặc</span>

            <Button
              type="button"
              onClick={handleToggleRecording}
              disabled={disabled}
              className="gap-2 bg-red-600 text-white shadow-md shadow-red-200 transition-all duration-200 hover:scale-105 hover:bg-red-700 hover:shadow-lg hover:shadow-red-300 active:scale-95"
            >
              <Mic className="size-4" />
              Ghi âm
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "rounded-full border p-3 transition-colors duration-200",
                isDragOver
                  ? "border-violet-300 bg-violet-100 text-violet-700"
                  : "bg-white",
              )}
            >
              <FileAudio className="size-5" />
            </div>

            <div className="min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="truncate text-sm font-semibold">
                    {truncText(value.name, { maxLength: 60, breakWord: true })}
                  </p>
                </TooltipTrigger>
                <TooltipContent>{value.name}</TooltipContent>
              </Tooltip>

              <p className="text-sm text-muted-foreground">
                {isDragOver
                  ? "File mới sẽ thay thế file đang chọn."
                  : `${(value.size / 1024 / 1024).toFixed(2)} MB`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePickFile}
              disabled={disabled}
            >
              Đổi file
            </Button>
            <Button
              type="button"
              onClick={handleToggleRecording}
              disabled={disabled}
              className="gap-2 bg-red-600 text-white shadow-md shadow-red-200 transition-all duration-200 hover:scale-105 hover:bg-red-700 hover:shadow-lg hover:shadow-red-300 active:scale-95"
            >
              <Mic className="size-4" />
              Ghi âm lại
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemoveFile}
              disabled={disabled}
            >
              <X className="mr-2 size-4" />
              Xóa
            </Button>
          </div>
        </div>
      )}

      {dropError && !error ? (
        <p className="relative z-10 mt-4 text-sm font-medium text-destructive">
          {dropError}
        </p>
      ) : null}
    </div>
  );
}
