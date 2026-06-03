import { Loader2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { VoiceIdentifyHistoryItem } from "../../types/voice-directory.types";

interface IdentifyHistoryTableProps {
  rows: VoiceIdentifyHistoryItem[];
  selectedAudioIds: Set<string>;
  canModify: boolean;
  canUpdateEmbedding: boolean;
  isUpdatingEmbedding: boolean;
  onToggleAudioSelection: (audioFileId: string) => void;
  onUpdateEmbedding: () => void;
  onOpenSessionAudio: (sessionId: string) => void;
}

export function IdentifyHistoryTable({
  rows,
  selectedAudioIds,
  canModify,
  canUpdateEmbedding,
  isUpdatingEmbedding,
  onToggleAudioSelection,
  onUpdateEmbedding,
  onOpenSessionAudio,
}: IdentifyHistoryTableProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold">
          Lịch sử nhận dạng (5 phiên gần nhất)
        </h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!canModify || !canUpdateEmbedding || isUpdatingEmbedding}
          onClick={onUpdateEmbedding}
        >
          {isUpdatingEmbedding ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : null}
          Cập nhật thông tin
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Thời điểm</TableHead>
            <TableHead>Điểm</TableHead>
            <TableHead className="w-30">Phiên</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground"
              >
                Chưa có lịch sử nhận dạng.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const audioFileId = row.audio_file_id;
              const selectable = canModify && Boolean(audioFileId);

              return (
                <TableRow key={row.session_id}>
                  <TableCell>
                    {selectable ? (
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={
                          audioFileId
                            ? selectedAudioIds.has(audioFileId)
                            : false
                        }
                        onChange={() =>
                          audioFileId && onToggleAudioSelection(audioFileId)
                        }
                        aria-label="Chọn mẫu để cập nhật embedding"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(row.identified_at).toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell>
                    {row.score != null ? row.score.toFixed(4) : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => onOpenSessionAudio(row.session_id)}
                    >
                      <Play className="size-3" />
                      Nghe
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </section>
  );
}
