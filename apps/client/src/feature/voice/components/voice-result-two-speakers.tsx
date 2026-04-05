import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { VoiceIdentifyTwoItem } from "../types/voice.types";

interface VoiceResultTwoSpeakersProps {
  items: VoiceIdentifyTwoItem[];
}

export function VoiceResultTwoSpeakers({ items }: VoiceResultTwoSpeakersProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Kết quả nhận diện 1-2 người nói</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Không có dữ liệu nhận diện.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={`${
                item.matched_voice_id || item.name || item.message
              }-${index}`}
              className="space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{item.message || "N/A"}</Badge>

                {typeof item.num_speakers === "number" ? (
                  <Badge variant="destructive">
                    num_speakers: {item.num_speakers}
                  </Badge>
                ) : null}

                {typeof item.score === "number" ? (
                  <Badge variant="secondary">
                    Score: {item.score.toFixed(4)}
                  </Badge>
                ) : null}
              </div>

              <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Họ tên</p>
                  <p className="font-medium">{item.name || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">CCCD</p>
                  <p className="font-medium">
                    {item.citizen_identification || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Điện thoại</p>
                  <p className="font-medium">{item.phone_number || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Nghề nghiệp</p>
                  <p className="font-medium">{item.job || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Quê quán</p>
                  <p className="font-medium">{item.hometown || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Hộ chiếu</p>
                  <p className="font-medium">{item.passport || "-"}</p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Audio path</p>
                  <p className="font-medium break-all">
                    {item.audio_path || "-"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">
                    Audio segments
                  </p>
                  {item.audio_segment && item.audio_segment.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.audio_segment.map((segment, segmentIndex) => (
                        <Badge
                          key={`${segment.start}-${segment.end}-${segmentIndex}`}
                          variant="outline"
                        >
                          {segment.start}s - {segment.end}s
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="font-medium">-</p>
                  )}
                </div>
              </div>

              {index < items.length - 1 ? <Separator /> : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
