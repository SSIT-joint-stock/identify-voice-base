import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { VoiceIdentifyItem } from "../types/voice.types";

interface VoiceTop5MatchTableProps {
  title: string;
  description?: string;
  items: VoiceIdentifyItem[];
  emptyText?: string;
  speakerIndex?: number;
}

export function VoiceTop5MatchTable({
  title,
  description,
  items,
  emptyText = "Không có dữ liệu.",
  speakerIndex = 0,
}: VoiceTop5MatchTableProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>STT</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>CCCD</TableHead>
                <TableHead>Điện thoại</TableHead>
                <TableHead>Điểm số</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow
                  key={`speaker-${speakerIndex}-match-${
                    item.matched_voice_id || item.name || "unknown"
                  }-${index}`}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {item.name || "-"}
                  </TableCell>
                  <TableCell>{item.citizen_identification || "-"}</TableCell>
                  <TableCell>{item.phone_number || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {typeof item.score === "number"
                        ? item.score.toFixed(4)
                        : "-"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
