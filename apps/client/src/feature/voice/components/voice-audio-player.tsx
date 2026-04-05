import { useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface VoiceAudioPlayerProps {
  file: File | null;
  title?: string;
  startAt?: number;
  endAt?: number;
  onReady?: () => void;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function VoiceAudioPlayer({
  file,
  title = "Audio player",
  startAt,
  endAt,
  onReady,
}: VoiceAudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) {
      return;
    }

    const waveSurfer = WaveSurfer.create({
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
      url: audioUrl,
    });

    waveSurferRef.current = waveSurfer;

    waveSurfer.on("ready", () => {
      setIsReady(true);
      setDuration(waveSurfer.getDuration());
      onReady?.();
    });

    waveSurfer.on("play", () => setIsPlaying(true));
    waveSurfer.on("pause", () => setIsPlaying(false));
    waveSurfer.on("finish", () => setIsPlaying(false));
    waveSurfer.on("timeupdate", (time) => setCurrentTime(time));

    return () => {
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      waveSurfer.destroy();
      waveSurferRef.current = null;
      setIsReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };
  }, [audioUrl, onReady]);
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
      wave.play();

      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
      }

      stopTimerRef.current = window.setTimeout(() => {
        wave.pause();
      }, (endAt - startAt) * 1000);
    }
  }, [startAt, endAt, isReady]);

  const togglePlay = async () => {
    const wave = waveSurferRef.current;
    if (!wave || !isReady) return;

    if (wave.isPlaying()) {
      wave.pause();
      return;
    }

    await wave.play();
  };

  if (!file || !audioUrl) return null;

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-background p-3">
          <div ref={containerRef} className="w-full" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <div className="truncate text-sm text-muted-foreground">
            {file.name}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
