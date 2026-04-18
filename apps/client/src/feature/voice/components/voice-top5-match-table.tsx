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
import { ChevronRight, Play } from "lucide-react";
import { useState } from "react";
import { VoiceDirectoryDetailSheet } from "@/feature/voice-directory/components/VoiceDirectoryDetailSheet";
import type { UpdateVoiceInfoResponse } from "@/feature/voice-directory/types/voice-directory.types";
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

function getDetailVoiceId(item: VoiceIdentifyItem) {
  const candidate = item.matched_voice_id || item.voice_id || "";

  if (!candidate) return null;
  if (item.truth_source === "AI" || item.truth_source === "NONE") return null;

  return candidate;
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
          className={`inline-block max-w-full cursor-help text-center leading-snug ${className ?? ""}`}
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
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [itemOverrides, setItemOverrides] = useState<
    Record<string, Partial<VoiceIdentifyItem>>
  >({});
  const shouldShowAudioColumn = items.length > 0;

  const handleProfileUpdated = (payload: UpdateVoiceInfoResponse) => {
    setItemOverrides((prev) => ({
      ...prev,
      [payload.id]: {
        ...prev[payload.id],
        name: payload.name,
        phone_number: payload.phone_number ?? undefined,
        job: payload.job ?? undefined,
      },
    }));
  };

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
            <div className="no-scrollbar overflow-x-auto">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[6%] px-0.5 text-center whitespace-nowrap">
                      <HeaderTooltip
                        label="STT"
                        description="Thứ tự kết quả khớp trong bảng."
                      />
                    </TableHead>
                    {shouldShowAudioColumn ? (
                      <TableHead className="w-[8%] px-0.5 text-center whitespace-nowrap">
                        <HeaderTooltip
                          label="Audio"
                          description="Mở hộp thoại để phát audio của người nói này."
                        />
                      </TableHead>
                    ) : null}
                    <TableHead className="w-[18%] pl-1 whitespace-nowrap">
                      <HeaderTooltip
                        label="Họ và tên"
                        description="Tên hồ sơ hoặc danh tính AI được ánh xạ với kết quả khớp."
                        className="text-left"
                      />
                    </TableHead>
                    <TableHead className="w-[16%] px-1 text-center whitespace-nowrap">
                      <HeaderTooltip
                        label="CCCD"
                        description="Số căn cước công dân hoặc mã định danh của hồ sơ."
                      />
                    </TableHead>
                    <TableHead className="w-[14%] px-1 text-center whitespace-nowrap">
                      <HeaderTooltip
                        label="SĐT"
                        description="Thông tin liên hệ lưu trong hồ sơ nhận dạng."
                      />
                    </TableHead>
                    <TableHead className="w-[12%] px-1 text-center whitespace-nowrap">
                      <HeaderTooltip
                        label="Điểm số"
                        description="Độ tương đồng giữa audio đầu vào và hồ sơ giọng nói đã lưu."
                      />
                    </TableHead>
                    <TableHead className="w-[8%] px-0.5 text-center whitespace-nowrap">
                      <HeaderTooltip
                        label="Sửa"
                        description="Mở chi tiết hồ sơ để xem hoặc chỉnh sửa thông tin."
                      />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => {
                    const detailVoiceId = getDetailVoiceId(item);
                    const displayItem =
                      detailVoiceId && itemOverrides[detailVoiceId]
                        ? { ...item, ...itemOverrides[detailVoiceId] }
                        : item;
                    const rowAudioUrl = getItemAudioUrl(displayItem);
                    const scoreMeta = getVoiceScoreMeta(displayItem.score);
                    const audioLabel = getItemAudioLabel(displayItem, index);

                    return (
                      <TableRow
                        key={`speaker-${speakerIndex}-match-${
                          item.matched_voice_id || displayItem.name || "unknown"
                        }-${index}`}
                      >
                        <TableCell className="w-[6%] px-0.5 text-center">
                          {index + 1}
                        </TableCell>
                        {shouldShowAudioColumn ? (
                          <TableCell className="w-[8%] px-0.5 text-center">
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
                        <TableCell className="w-[18%] min-w-0 pl-1 font-medium">
                          <TextCellTooltip
                            value={displayItem.name}
                            className="truncate"
                          />
                        </TableCell>
                        <TableCell className="w-[16%] px-1 text-center">
                          <TextCellTooltip
                            value={displayItem.citizen_identification}
                            className="truncate text-center"
                          />
                        </TableCell>
                        <TableCell className="w-[14%] px-1 text-center">
                          <TextCellTooltip
                            value={displayItem.phone_number}
                            className="truncate text-center"
                          />
                        </TableCell>
                        <TableCell className="w-[12%] px-1 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className={`mx-auto border ${scoreMeta.badgeClassName}`}
                              >
                                {typeof displayItem.score === "number"
                                  ? displayItem.score.toFixed(4)
                                  : "-"}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {typeof displayItem.score === "number"
                                ? `Score: ${displayItem.score.toFixed(4)}`
                                : "Không có điểm số"}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="w-[8%] px-0.5 text-center">
                          {detailVoiceId ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="mx-auto h-8 w-8 p-0 text-slate-400 hover:bg-primary-50 hover:text-primary-400"
                              onClick={() => {
                                setSelectedVoiceId(detailVoiceId);
                                setDetailOpen(true);
                              }}
                              aria-label={`Mở chi tiết hồ sơ của ${audioLabel.personName}`}
                            >
                              <ChevronRight className="size-4" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
      <VoiceDirectoryDetailSheet
        voiceId={selectedVoiceId}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedVoiceId(null);
          }
        }}
        onDeactivated={() => {
          setDetailOpen(false);
          setSelectedVoiceId(null);
        }}
        onUpdated={handleProfileUpdated}
      />
    </>
  );
}
