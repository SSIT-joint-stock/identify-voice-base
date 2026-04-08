import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VoiceTop5MatchTable } from "./voice-top5-match-table";
import type {
  VoiceIdentifyItem,
  VoiceIdentifyTwoItem,
} from "../types/voice.types";

interface VoiceSpeakerResultCardProps {
  title: string;
  item: VoiceIdentifyTwoItem;
  onRegisterUnknown: () => void;
  onSelectSegment?: (start: number, end?: number) => void;
  speakerIndex?: number;
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isUnknownSpeaker(item: VoiceIdentifyTwoItem) {
  const message = (item.message || "").toLowerCase();
  const matchedId = (item.matched_voice_id || "").toString().trim();

  // If matched_voice_id is empty, "0", or contains common unknown strings
  const hasNoId = !matchedId || matchedId === "0" || matchedId === "-1";

  return (
    hasNoId ||
    message.includes("no matching") ||
    message.includes("unknown") ||
    message.includes("not found") ||
    message.includes("chưa tìm thấy") ||
    message.includes("không tìm thấy")
  );
}

export function VoiceSpeakerResultCard({
  title,
  item,
  onRegisterUnknown,
  onSelectSegment,
  speakerIndex = 0,
}: VoiceSpeakerResultCardProps) {
  const [isTimestampOpen, setIsTimestampOpen] = useState(true);
  const isUnknown = isUnknownSpeaker(item);
  const top5Items: VoiceIdentifyItem[] = isUnknown ? [] : [item];
  console.log(item.audio_segment);
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{!isUnknown && item.name ? item.name : title}</CardTitle>
        <CardDescription>
          {!isUnknown && item.citizen_identification
            ? `CCCD: ${item.citizen_identification}`
            : item.message || "Không có mô tả kết quả"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {typeof item.score === "number" ? (
            <Badge
              variant="secondary"
              className="px-3 py-1 text-sm font-medium"
            >
              Điểm số: {item.score.toFixed(4)}
            </Badge>
          ) : null}

          {typeof item.num_speakers === "number" ? (
            <Badge variant="destructive">
              num_speakers: {item.num_speakers}
            </Badge>
          ) : null}
        </div>

        {item.audio_segment && item.audio_segment.length > 0 ? (
          <div className="space-y-2">
            <div
              className="flex w-fit cursor-pointer items-center gap-2 rounded-md hover:opacity-80 transition-opacity"
              onClick={() => setIsTimestampOpen(!isTimestampOpen)}
            >
              <p className="text-sm font-medium">Thời gian xuất hiện</p>
              {isTimestampOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {isTimestampOpen && (
              <div className="flex flex-wrap gap-2 pt-1">
                {item.audio_segment.map((segment, index) => (
                  <Button
                    key={`${segment.start}-${segment.end}-${index}`}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onSelectSegment?.(segment.start, segment.end)
                    }
                  >
                    {formatSeconds(segment.start)} -{" "}
                    {formatSeconds(segment.end)}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {!isUnknown ? (
          <VoiceTop5MatchTable
            title="Kết quả phù hợp"
            description="Thông tin người nói được nhận diện dựa trên dữ liệu đã đăng ký."
            items={top5Items}
            emptyText="Không có dữ liệu phù hợp."
            speakerIndex={speakerIndex}
          />
        ) : (
          <div className="rounded-2xl border border-dashed p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Chưa tìm thấy người phù hợp
              </p>
              <Button type="button" onClick={onRegisterUnknown}>
                Đăng ký giọng nói
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
