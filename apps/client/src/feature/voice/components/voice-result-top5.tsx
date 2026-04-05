import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface VoiceResultTop5Props {
  items: VoiceIdentifyItem[];
}

export function VoiceResultTop5({ items }: VoiceResultTop5Props) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Top 5 kết quả giống nhất</CardTitle>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Không có kết quả phù hợp.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hạng</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>CCCD/CMND</TableHead>
                <TableHead>Điện thoại</TableHead>
                <TableHead>Nghề nghiệp</TableHead>
                <TableHead>Điểm số</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow
                  key={`${
                    item.matched_voice_id || item.name || item.message
                  }-${index}`}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{item.message || "-"}</TableCell>
                  <TableCell className="font-medium">
                    {item.name || "-"}
                  </TableCell>
                  <TableCell>{item.citizen_identification || "-"}</TableCell>
                  <TableCell>{item.phone_number || "-"}</TableCell>
                  <TableCell>{item.job || "-"}</TableCell>
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
