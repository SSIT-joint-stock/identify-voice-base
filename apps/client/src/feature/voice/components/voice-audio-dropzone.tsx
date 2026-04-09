import { useRef } from "react";
import { Upload, FileAudio, X, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAudioRecorder } from "../hooks/use-audio-recorder";

interface VoiceAudioDropzoneProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  error?: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function VoiceAudioDropzone({
  value,
  onChange,
  disabled = false,
  label = "Tải file audio",
  description = "Hỗ trợ mp3, wav, m4a, webm, ogg, flac",
  error,
}: VoiceAudioDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { isRecording, duration, startRecording, stopRecording } =
    useAudioRecorder();

  const handlePickFile = () => {
    if (disabled || isRecording) return;
    inputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onChange(file);
  };

  const handleRemoveFile = () => {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleToggleRecording = async () => {
    if (disabled) return;

    if (isRecording) {
      const file = await stopRecording();
      if (file) {
        onChange(file);
      }
    } else {
      try {
        await startRecording();
      } catch {
        // Permission denied or no mic
      }
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed p-6 transition-colors",
        "bg-card text-card-foreground",
        disabled && "cursor-not-allowed opacity-60",
        error && "border-destructive",
        isRecording && "border-red-400 bg-red-50/50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isRecording}
      />

      {isRecording ? (
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          {/* Pulsing wave animation */}
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
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full border p-3">
            <Upload className="size-5" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handlePickFile}
              disabled={disabled}
            >
              Chọn file audio
            </Button>

            <span className="text-xs text-muted-foreground">hoặc</span>

            <Button
              type="button"
              onClick={handleToggleRecording}
              disabled={disabled}
              className="gap-2 bg-red-600 text-white shadow-md shadow-red-200 transition-all duration-200 hover:bg-red-700 hover:scale-105 hover:shadow-lg hover:shadow-red-300 active:scale-95"
            >
              <Mic className="size-4" />
              Ghi âm
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full border p-3">
              <FileAudio className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{value.name}</p>
              <p className="text-sm text-muted-foreground">
                {(value.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>

          <div className="flex gap-2">
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
              className="gap-2 bg-red-600 text-white shadow-md shadow-red-200 transition-all duration-200 hover:bg-red-700 hover:scale-105 hover:shadow-lg hover:shadow-red-300 active:scale-95"
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
    </div>
  );
}
