import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LoaderCircle, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { formatAudioTime } from "../utils/translate-file.utils";

interface TranslateAudioPreviewProps {
  file: File | null;
  className?: string;
  onLoadingChange?: (isLoading: boolean) => void;
}

const WAVEFORM_FALLBACK_MESSAGE =
  "Không thể dựng waveform. Có thể nghe bằng trình phát mặc định bên dưới.";

export function TranslateAudioPreview({
  file,
  className,
  onLoadingChange,
}: TranslateAudioPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const isLoading = Boolean(file) && !audioError && !isReady;

  const objectUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  useEffect(() => {
    if (!file || !containerRef.current) return;

    let isDisposed = false;
    let frameId: number | null = null;
    let waveSurfer: WaveSurfer | null = null;

    frameId = window.requestAnimationFrame(() => {
      if (!containerRef.current || isDisposed) return;

      waveSurfer = WaveSurfer.create({
        container: containerRef.current,
        height: 96,
        waveColor: "#cbd5e1",
        progressColor: "#0f172a",
        cursorColor: "#ef4444",
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true,
        dragToSeek: true,
        backend: "MediaElement",
      });

      waveSurferRef.current = waveSurfer;

      waveSurfer.on("ready", () => {
        if (isDisposed || !waveSurfer) return;
        setAudioError(null);
        setIsReady(true);
        setDuration(waveSurfer.getDuration());
      });

      waveSurfer.on("play", () => {
        if (!isDisposed) setIsPlaying(true);
      });

      waveSurfer.on("pause", () => {
        if (!isDisposed) setIsPlaying(false);
      });

      waveSurfer.on("finish", () => {
        if (!isDisposed) setIsPlaying(false);
      });

      waveSurfer.on("timeupdate", (time) => {
        if (!isDisposed) setCurrentTime(time);
      });

      waveSurfer.on("error", (error) => {
        if (isDisposed) return;
        setAudioError(error.message || WAVEFORM_FALLBACK_MESSAGE);
        setIsReady(false);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      });

      void waveSurfer.loadBlob(file).catch((error) => {
        if (isDisposed) return;
        setAudioError(
          error instanceof Error && error.message
            ? error.message
            : WAVEFORM_FALLBACK_MESSAGE,
        );
        setIsReady(false);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      });
    });

    return () => {
      isDisposed = true;

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      waveSurfer?.destroy();
      waveSurferRef.current = null;
      setAudioError(null);
      setIsReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };
  }, [file]);

  const togglePlay = async () => {
    const wave = waveSurferRef.current;
    if (!wave || !isReady) return;

    if (wave.isPlaying()) {
      wave.pause();
      return;
    }

    try {
      await wave.play();
    } catch (error) {
      setAudioError(
        error instanceof Error && error.message
          ? error.message
          : WAVEFORM_FALLBACK_MESSAGE,
      );
    }
  };

  if (!file) return null;

  return (
    <Card className={cn("rounded-md", className)}>
      <CardHeader>
        <CardTitle>Preview audio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-background p-3">
          <div
            ref={containerRef}
            className={cn("w-full", audioError && "hidden")}
          />

          {isLoading ? (
            <div className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              Đang tải audio...
            </div>
          ) : null}

          {audioError ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{audioError}</p>
              {objectUrl ? (
                <audio
                  controls
                  preload="metadata"
                  src={objectUrl}
                  className="w-full"
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {!audioError ? (
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={togglePlay}
              disabled={!isReady}
            >
              {isPlaying ? (
                <>
                  <Pause className="mr-2 size-4" />
                  Tạm dừng
                </>
              ) : (
                <>
                  <Play className="mr-2 size-4" />
                  Phát
                </>
              )}
            </Button>

            <div className="text-sm text-muted-foreground">
              {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
            </div>

            <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              {file.name}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
