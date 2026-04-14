import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Play } from "lucide-react";
import { useState } from "react";
import type { VoiceIdentifyItem } from "../types/voice.types";
import { getVoiceScoreMeta } from "../utils/voice-score";
import { VoiceAudioPlayer } from "./voice-audio-player";

interface VoiceTop5MatchTableProps {
  title: string;
  description?: string;
  items: VoiceIdentifyItem[];
  emptyText?: string;
  speakerIndex?: number;
}

interface AudioDialogState {
  audioUrl: string;
  fileName: string;
  personName: string;
}

function getItemAudioUrl(item: VoiceIdentifyItem) {
  return item.audio_url || item.enroll_audio_url || undefined;
}

function getItemAudioLabel(item: VoiceIdentifyItem, rowIndex: number) {
  const personName = item.name?.trim() || `Nguoi ${rowIndex + 1}`;
  return {
    personName,
    fileName: `${personName}.wav`,
  };
}

function HeaderTooltip({
  label,
  description,
  className,
}: {
  label: string;
  description: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex cursor-help items-center justify-center underline decoration-dotted underline-offset-4 ${className ?? ""}`}
        >
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}

function TextCellTooltip({
  value,
  fallback = "-",
  className,
}: {
  value?: string;
  fallback?: string;
  className?: string;
}) {
  const text = value?.trim() || fallback;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={className}>{text}</div>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

export function VoiceTop5MatchTable({
  title,
  description,
  items,
  emptyText = "Không có dữ liệu.",
  speakerIndex = 0,
}: VoiceTop5MatchTableProps) {
  const [audioDialog, setAudioDialog] = useState<AudioDialogState | null>(null);
  const shouldShowAudioColumn = items.length > 0;

  return (
    <>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </CardHeader>

        <CardContent>
          {items.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 px-1 text-center">
                    <HeaderTooltip
                      label="STT"
                      description="Thứ tự kết quả khớp trong bảng."
                    />
                  </TableHead>
                  {shouldShowAudioColumn ? (
                    <TableHead className="w-16 px-1 text-center">
                      <HeaderTooltip
                        label="Audio"
                        description="Mở hộp thoại để phát audio của người nói này."
                      />
                    </TableHead>
                  ) : null}
                  <TableHead className="w-20 pl-2">
                    <HeaderTooltip
                      label="Họ và tên"
                      description="Tên hồ sơ hoặc danh tính AI được ánh xạ với kết quả khớp."
                      className="justify-start"
                    />
                  </TableHead>
                  <TableHead className="w-40 text-center">
                    <HeaderTooltip
                      label="CCCD"
                      description="Số căn cước công dân hoặc mã định danh của hồ sơ."
                    />
                  </TableHead>
                  <TableHead className="w-32 text-center">
                    <HeaderTooltip
                      label="Số điện thoại"
                      description="Thông tin liên hệ lưu trong hồ sơ nhận dạng."
                    />
                  </TableHead>
                  <TableHead className="w-40 text-center">
                    <HeaderTooltip
                      label="Điểm số"
                      description="Độ tương đồng giữa audio đầu vào và hồ sơ giọng nói đã lưu."
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const rowAudioUrl = getItemAudioUrl(item);
                  const scoreMeta = getVoiceScoreMeta(item.score);
                  const audioLabel = getItemAudioLabel(item, index);

                  return (
                    <TableRow
                      key={`speaker-${speakerIndex}-match-${
                        item.matched_voice_id || item.name || "unknown"
                      }-${index}`}
                    >
                      <TableCell className="w-12 px-1 text-center">
                        {index + 1}
                      </TableCell>
                      {shouldShowAudioColumn ? (
                        <TableCell className="w-16 px-1 text-center">
                          {rowAudioUrl ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  className="mx-auto size-8 rounded-full bg-red-600 text-white shadow-sm hover:bg-red-700"
                                  onClick={() =>
                                    setAudioDialog({
                                      audioUrl: rowAudioUrl,
                                      fileName: audioLabel.fileName,
                                      personName: audioLabel.personName,
                                    })
                                  }
                                  aria-label={`Mở audio của ${audioLabel.personName}`}
                                >
                                  <Play className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {`Phát audio của ${audioLabel.personName}`}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell className="max-w-20 pl-2 font-medium">
                        <TextCellTooltip
                          value={item.name}
                          className="truncate"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <TextCellTooltip
                          value={item.citizen_identification}
                          className="truncate text-center"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <TextCellTooltip
                          value={item.phone_number}
                          className="truncate text-center"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className={`mx-auto border ${scoreMeta.badgeClassName}`}
                            >
                              {typeof item.score === "number"
                                ? item.score.toFixed(4)
                                : "-"}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {typeof item.score === "number"
                              ? `Score: ${item.score.toFixed(4)}`
                              : "Không có điểm số"}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={audioDialog !== null}
        onOpenChange={(open) => !open && setAudioDialog(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{audioDialog?.personName || "Phát audio"}</DialogTitle>
            <DialogDescription>
              {audioDialog
                ? `Phát audio của ${audioDialog.personName} với file ${audioDialog.fileName}`
                : "Audio player"}
            </DialogDescription>
          </DialogHeader>

          {audioDialog ? (
            <VoiceAudioPlayer
              file={null}
              audioUrl={audioDialog.audioUrl}
              fileName={audioDialog.fileName}
              title={`Audio của ${audioDialog.personName}`}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
