import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, UserRound, Waves } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { QUERY_KEYS } from "@/constants";
import { sessionsApi } from "@/feature/sessions/api/sessions.api";
import type {
  SessionSegment,
  SessionSpeaker,
} from "@/feature/sessions/types/session.types";
import { VoiceAudioPlayer } from "@/feature/voice/components/voice-audio-player";

export interface SessionDetailSheetProps {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function getTruthSourceLabel(source: SessionSpeaker["truth_source"]) {
  switch (source) {
    case "BUSINESS":
      return "Giọng nói đã được đăng ký cùng định danh";
    case "AI":
      return "Danh tính do AI định danh trước đó, chưa được đăng ký";
    default:
      return "Chưa xác định";
  }
}

function getTruthSourceVariant(source: SessionSpeaker["truth_source"]) {
  switch (source) {
    case "BUSINESS":
      return "default";
    case "AI":
      return "secondary";
    default:
      return "outline";
  }
}

function getScoreTone(score: number | null) {
  if (score === null) return "border-slate-200 bg-slate-50 text-slate-600";
  if (score >= 0.9) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (score >= 0.7) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function formatScore(score: number | null) {
  return score === null ? "N/A" : score.toFixed(3);
}

function getTotalSegmentDuration(segments?: SessionSegment[] | null) {
  if (!Array.isArray(segments)) return 0;

  return segments.reduce(
    (total, item) => total + Math.max(item.end - item.start, 0),
    0,
  );
}

function SpeakerAudioPlayer({ speaker }: { speaker: SessionSpeaker }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  console.log(speaker);
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const handleLoadAudio = async () => {
    if (!speaker.audio_url) return;

    if (blobUrl) {
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const blob = await sessionsApi.getSpeakerAudioBlob(speaker.audio_url);
      const nextBlobUrl = URL.createObjectURL(blob);
      setBlobUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return nextBlobUrl;
      });
    } catch {
      setError("Không thể tải audio của người nói.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!speaker.audio_url) {
    return (
      <p className="text-xs text-muted-foreground">
        Speaker này chưa có audio tách riêng nên hãy nghe audio gốc để đối
        chiếu.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void handleLoadAudio()}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Play className="size-4" />
        )}
        {blobUrl ? "Tải lại audio của người nói" : "Nghe audio của người nói"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {blobUrl ? (
        <VoiceAudioPlayer
          file={null}
          audioUrl={blobUrl}
          fileName={`${speaker.speaker_label}.wav`}
          compact
        />
      ) : null}
    </div>
  );
}

export function SessionDetailSheet({
  sessionId,
  open,
  onOpenChange,
}: SessionDetailSheetProps) {
  const detailQuery = useQuery({
    queryKey: sessionId
      ? QUERY_KEYS.voice.sessions.detail(sessionId)
      : ["voice", "sessions", "detail", "none"],
    queryFn: () => sessionsApi.getSessionDetail(sessionId!),
    enabled: Boolean(sessionId && open),
  });

  const detail = detailQuery.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-4xl">
        <SheetHeader className="shrink-0 border-b pb-4">
          <SheetTitle>Chi tiết phiên nhận dạng</SheetTitle>
          <SheetDescription>
            {sessionId
              ? `Phiên ${sessionId.slice(0, 8)}...`
              : "Đang chọn phiên"}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {detailQuery.isLoading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : detailQuery.isError || !detail ? (
            <div className="flex min-h-48 items-center justify-center">
              <p className="text-sm text-destructive">
                Không tải được chi tiết phiên.
              </p>
            </div>
          ) : (
            <>
              <Card size="sm">
                <CardHeader className="border-b">
                  <CardTitle>Thông tin phiên</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">
                        Thời gian nhận dạng
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {formatDateTime(detail.identified_at)}
                      </p>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">
                        Số speaker
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {detail.speakers.length}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Audio gốc</p>
                    <VoiceAudioPlayer
                      file={null}
                      audioUrl={detail.audio_url}
                      fileName={`session-${detail.id.slice(0, 8)}.wav`}
                      compact
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {detail.speakers.length === 0 ? (
                  <Card size="sm">
                    <CardContent className="flex min-h-32 items-center justify-center">
                      <div className="text-center">
                        <UserRound className="mx-auto size-8 text-slate-300" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          Phiên này chưa có dữ liệu speaker.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  detail.speakers.map((speaker) => {
                    const segmentCount = Array.isArray(speaker.segments)
                      ? speaker.segments.length
                      : 0;
                    const totalDuration = getTotalSegmentDuration(
                      speaker.segments,
                    );

                    return (
                      <Card key={speaker.speaker_label} size="sm">
                        <CardHeader className="border-b">
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle>
                              {speaker.name || speaker.speaker_label}
                            </CardTitle>
                            <Badge
                              variant={getTruthSourceVariant(
                                speaker.truth_source,
                              )}
                            >
                              {getTruthSourceLabel(speaker.truth_source)}
                            </Badge>
                            <span
                              className={`inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium ${getScoreTone(speaker.score)}`}
                            >
                              Score {formatScore(speaker.score)}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border bg-muted/20 p-3">
                              <p className="text-xs text-muted-foreground">
                                Speaker label
                              </p>
                              <p className="mt-1 text-sm font-medium">
                                {speaker.speaker_label}
                              </p>
                            </div>
                            <div className="rounded-lg border bg-muted/20 p-3">
                              <p className="text-xs text-muted-foreground">
                                Matched voice ID
                              </p>
                              <p className="mt-1 break-all text-sm font-medium">
                                {speaker.matched_voice_id ?? "Không có"}
                              </p>
                            </div>
                            <div className="rounded-lg border bg-muted/20 p-3">
                              <p className="text-xs text-muted-foreground">
                                Số segment
                              </p>
                              <p className="mt-1 text-sm font-medium">
                                {segmentCount}
                              </p>
                            </div>
                            <div className="rounded-lg border bg-muted/20 p-3">
                              <p className="text-xs text-muted-foreground">
                                Tổng thời lượng nói
                              </p>
                              <p className="mt-1 text-sm font-medium">
                                {totalDuration.toFixed(1)} giây
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-2 md:grid-cols-2">
                            <p className="text-sm text-muted-foreground">
                              CCCD:{" "}
                              <span className="font-medium text-foreground">
                                {speaker.citizen_identification || "—"}
                              </span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              SĐT:{" "}
                              <span className="font-medium text-foreground">
                                {speaker.phone_number || "—"}
                              </span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Quê quán:{" "}
                              <span className="font-medium text-foreground">
                                {speaker.hometown || "—"}
                              </span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Nghề nghiệp:{" "}
                              <span className="font-medium text-foreground">
                                {speaker.job || "—"}
                              </span>
                            </p>
                          </div>

                          <div className="rounded-lg border bg-slate-50/70 p-3">
                            <div className="mb-2 flex items-center gap-2">
                              <Waves className="size-4 text-slate-500" />
                              <p className="text-sm font-medium">
                                Audio của người nói
                              </p>
                            </div>
                            <SpeakerAudioPlayer speaker={speaker} />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
