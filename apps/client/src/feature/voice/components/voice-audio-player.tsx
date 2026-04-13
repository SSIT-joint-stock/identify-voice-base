import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import WaveSurfer from "wavesurfer.js";

export interface VoiceAudioPlayerProps {
  file: File | null;
  audioUrl?: string | null;
  fileName?: string;
  title?: string;
  startAt?: number;
  endAt?: number;
  onReady?: () => void;
  footerAction?: ReactNode;
  footerActionWrapperClassName?: string;
  compact?: boolean;
}

const WAVEFORM_FALLBACK_MESSAGE =
  "Khong the tai waveform cho file audio nay. Ban van co the phat bang trinh phat mac dinh ben duoi.";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function VoiceAudioPlayer({
  file,
  audioUrl,
  fileName,
  title = "Audio player",
  startAt,
  endAt,
  onReady,
  footerAction,
  footerActionWrapperClassName,
  compact = false,
}: VoiceAudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const objectUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  const resolvedAudioUrl = file ? objectUrl : (audioUrl ?? null);
  const resolvedFileName = file?.name ?? fileName ?? "audio";

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  useEffect(() => {
    if (!containerRef.current || !resolvedAudioUrl) {
      return;
    }

    let isDisposed = false;
    let frameId: number | null = null;
    let waveSurfer: WaveSurfer | null = null;

    frameId = window.requestAnimationFrame(() => {
      if (!containerRef.current || isDisposed) {
        return;
      }

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
        onReady?.();
      });

      waveSurfer.on("play", () => {
        if (!isDisposed) {
          setIsPlaying(true);
        }
      });

      waveSurfer.on("pause", () => {
        if (!isDisposed) {
          setIsPlaying(false);
        }
      });

      waveSurfer.on("finish", () => {
        if (!isDisposed) {
          setIsPlaying(false);
        }
      });

      waveSurfer.on("timeupdate", (time) => {
        if (!isDisposed) {
          setCurrentTime(time);
        }
      });

      waveSurfer.on("error", (error) => {
        if (isDisposed) return;

        setAudioError(error.message || WAVEFORM_FALLBACK_MESSAGE);
        setIsReady(false);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      });

      const loadPromise = file
        ? waveSurfer.loadBlob(file)
        : waveSurfer.load(resolvedAudioUrl);

      void loadPromise.catch((error) => {
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

      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }

      waveSurfer?.destroy();
      waveSurferRef.current = null;
      setAudioError(null);
      setIsReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };
  }, [file, onReady, resolvedAudioUrl]);

  useEffect(() => {
    const wave = waveSurferRef.current;
    if (!wave || !isReady) return;
    if (typeof startAt !== "number" || !Number.isFinite(startAt)) return;

    wave.setTime(startAt);

    if (
      typeof endAt === "number" &&
      Number.isFinite(endAt) &&
      endAt > startAt
    ) {
      void wave.play();

      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
      }

      stopTimerRef.current = window.setTimeout(
        () => {
          wave.pause();
        },
        (endAt - startAt) * 1000,
      );
    }
  }, [startAt, endAt, isReady]);

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

  if (!resolvedAudioUrl) return null;

  const content = (
    <CardContent className={cn("space-y-4", compact && "px-4 py-4")}>
      <div
        className={cn(
          "rounded-xl border bg-background p-3",
          compact && "overflow-hidden rounded-2xl py-2",
        )}
      >
        <div
          ref={containerRef}
          className={cn(
            "w-full",
            compact && "min-h-[64px]",
            audioError && "hidden",
          )}
        />

        {audioError ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {WAVEFORM_FALLBACK_MESSAGE}
            </p>
            <audio
              controls
              preload="metadata"
              src={resolvedAudioUrl}
              className="w-full"
            />
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
            size={compact ? "sm" : "default"}
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
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {resolvedFileName}
          </div>
        </div>
      ) : (
        <div className="min-w-0 truncate text-sm text-muted-foreground">
          {resolvedFileName}
        </div>
      )}

      {footerAction ? (
        <div className={cn("flex justify-end", footerActionWrapperClassName)}>
          {footerAction}
        </div>
      ) : null}
    </CardContent>
  );

  return (
    <Card className={cn("rounded-2xl", compact && "gap-0")}>
      {!compact ? (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      ) : null}
      {content}
    </Card>
  );
}
