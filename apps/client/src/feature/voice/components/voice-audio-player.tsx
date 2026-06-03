import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNormalizeAudio } from "@/feature/voice/hooks/use-normalize-audio";
import { formatTime } from "@/feature/voice/utils/format";
import { cn } from "@/lib/utils";
import {
  Download,
  Loader,
  Loader2,
  MessageCircleWarning,
  Pause,
  Play,
} from "lucide-react";
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
  inlineFooterAction?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  compact?: boolean;
  showDownload?: boolean;
  onOpenTranscript?: () => void;
  isTranscribing?: boolean;
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
  inlineFooterAction = false,
  isLoading = false,
  loadingText,
  compact = false,
  isTranscribing = false,
  onOpenTranscript,
  showDownload = false,
}: VoiceAudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const { WAVEFORM_FALLBACK_MESSAGE, fetchProtectedAudioBlob } =
    useNormalizeAudio();

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [remoteAudioUrl, setRemoteAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const objectUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  const hasAudioSource = Boolean(file || audioUrl);
  const resolvedAudioUrl = file ? objectUrl : audioUrl ? remoteAudioUrl : null;
  const resolvedFileName = file?.name ?? fileName ?? "audio";
  const visibleAudioError = file || audioUrl ? audioError : null;
  const visibleIsLoadingAudio =
    !file && !!audioUrl && (isLoadingAudio || (!remoteAudioUrl && !audioError));
  const visibleIsPreparingWaveform =
    hasAudioSource &&
    Boolean(resolvedAudioUrl) &&
    !visibleAudioError &&
    !isReady;
  const visibleIsLoading =
    isLoading || visibleIsLoadingAudio || visibleIsPreparingWaveform;

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  useEffect(() => {
    if (file || !audioUrl) {
      return;
    }

    let isDisposed = false;
    let nextObjectUrl: string | null = null;

    queueMicrotask(() => {
      if (isDisposed) return;
      setIsLoadingAudio(true);
      setAudioError(null);
      setRemoteAudioUrl(null);
    });

    void fetchProtectedAudioBlob(audioUrl)
      .then((blob) => {
        if (isDisposed) return;

        nextObjectUrl = URL.createObjectURL(blob);
        setRemoteAudioUrl(nextObjectUrl);
      })
      .catch((error) => {
        if (isDisposed) return;

        setRemoteAudioUrl(null);
        setAudioError(
          error instanceof Error && error.message
            ? error.message
            : WAVEFORM_FALLBACK_MESSAGE,
        );
      })
      .finally(() => {
        if (!isDisposed) {
          setIsLoadingAudio(false);
        }
      });

    return () => {
      isDisposed = true;

      if (nextObjectUrl) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [audioUrl, file, WAVEFORM_FALLBACK_MESSAGE, fetchProtectedAudioBlob]);

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
  }, [file, onReady, resolvedAudioUrl, WAVEFORM_FALLBACK_MESSAGE]);

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

  const downloadAudio = () => {
    if (!resolvedAudioUrl) return;

    const link = document.createElement("a");
    link.href = resolvedAudioUrl;
    link.download = resolvedFileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!hasAudioSource && !visibleIsLoading) return null;

  const content = (
    <CardContent className={cn("space-y-4", compact && "px-4 py-4")}>
      <div
        className={cn(
          "relative min-h-30.5 rounded-xl border bg-background p-3",
          compact && "overflow-hidden rounded-2xl py-2",
        )}
      >
        <div
          ref={containerRef}
          className={cn(
            "h-24 min-h-24 w-full",
            compact && "h-24 min-h-24",
            visibleAudioError && "hidden",
          )}
        />

        {visibleIsLoading ? (
          <div className="absolute inset-3 flex items-center justify-center rounded-lg bg-background/85 text-sm text-muted-foreground backdrop-blur-[1px]">
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            {loadingText ??
              (visibleIsLoadingAudio
                ? "Đang tải audio..."
                : "Đang chuẩn bị phổ thanh...")}
          </div>
        ) : null}

        {visibleAudioError ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{visibleAudioError}</p>
            {resolvedAudioUrl ? (
              <audio
                controls
                preload="metadata"
                src={resolvedAudioUrl}
                className="w-full"
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {!visibleAudioError ? (
        <div className="flex min-h-10 min-w-0 flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={togglePlay}
            disabled={!isReady || visibleIsLoading}
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
            {visibleIsLoading
              ? "00:00 / 00:00"
              : `${formatTime(currentTime)} / ${formatTime(duration)}`}
          </div>

          <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {resolvedFileName}
          </div>

          {onOpenTranscript ? (
            <Button
              type="button"
              variant="outline"
              size={"sm"}
              className="w-full sm:w-auto"
              disabled={!hasAudioSource || visibleIsLoading || isTranscribing}
              onClick={onOpenTranscript}
            >
              {isTranscribing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <MessageCircleWarning className="mr-2 size-4" />
              )}
              Xem nội dung audio
            </Button>
          ) : null}

          {showDownload ? (
            <Button
              type="button"
              variant="outline"
              onClick={downloadAudio}
              disabled={!resolvedAudioUrl || visibleIsLoading}
              size={compact ? "sm" : "default"}
            >
              <Download className="mr-2 size-4" />
              Tải audio
            </Button>
          ) : null}

          {footerAction && inlineFooterAction ? (
            <div
              className={cn("ml-auto shrink-0", footerActionWrapperClassName)}
            >
              {footerAction}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="min-w-0 truncate text-sm text-muted-foreground">
          {resolvedFileName}
        </div>
      )}

      {footerAction && !inlineFooterAction ? (
        <div className={cn("flex justify-end", footerActionWrapperClassName)}>
          {footerAction}
        </div>
      ) : null}
    </CardContent>
  );

  return (
    <Card className={cn("rounded-md", compact && "gap-0")}>
      {!compact ? (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      ) : null}
      {content}
    </Card>
  );
}
