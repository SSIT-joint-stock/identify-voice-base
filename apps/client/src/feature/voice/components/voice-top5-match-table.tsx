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
import { Play, Trash2, UserPlus } from "lucide-react";
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
  onDeleteItem?: (item: VoiceIdentifyItem) => void;
  deletingUserId?: string | null;
  onRegisterItem?: (item: VoiceIdentifyItem) => void;
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
          className={`inline-block max-w-full cursor-help text-center leading-snug underline decoration-dotted underline-offset-4 ${className ?? ""}`}
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
  onDeleteItem,
  deletingUserId = null,
  onRegisterItem,
}: VoiceTop5MatchTableProps) {
  const [audioDialog, setAudioDialog] = useState<AudioDialogState | null>(null);
  const shouldShowAudioColumn = items.length > 0;
  const shouldShowActionColumn =
    typeof onDeleteItem === "function" || typeof onRegisterItem === "function";

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
            <div className="overflow-x-auto">
              <Table className="min-w-[760px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14 px-1 text-center whitespace-nowrap">
                      <HeaderTooltip
                        label="STT"
                        description="Thứ tự kết quả khớp trong bảng."
                      />
                    </TableHead>
                    {shouldShowAudioColumn ? (
                      <TableHead className="w-16 px-1 text-center whitespace-nowrap">
                        <HeaderTooltip
                          label="Audio"
                          description="Mở hộp thoại để phát audio của người nói này."
                        />
                      </TableHead>
                    ) : null}
                    <TableHead className="w-[24%] min-w-[180px] pl-2 whitespace-nowrap">
                      <HeaderTooltip
                        label="Họ tên"
                        description="Tên hồ sơ hoặc danh tính AI được ánh xạ với kết quả khớp."
                        className="text-left"
                      />
                    </TableHead>
                    <TableHead className="w-[18%] text-center whitespace-nowrap">
                      <HeaderTooltip
                        label="CCCD"
                        description="Số căn cước công dân hoặc mã định danh của hồ sơ."
                      />
                    </TableHead>
                    <TableHead className="w-[16%] text-center whitespace-nowrap">
                      <HeaderTooltip
                        label="SĐT"
                        description="Thông tin liên hệ lưu trong hồ sơ nhận dạng."
                      />
                    </TableHead>
                    <TableHead className="w-[14%] text-center whitespace-nowrap">
                      <HeaderTooltip
                        label="Điểm"
                        description="Độ tương đồng giữa audio đầu vào và hồ sơ giọng nói đã lưu."
                      />
                    </TableHead>
                    {shouldShowActionColumn ? (
                      <TableHead className="w-28 px-1 text-center whitespace-nowrap">
                        <HeaderTooltip
                          label="Thao tác"
                          description="Các thao tác nhanh cho kết quả nhận dạng này."
                        />
                      </TableHead>
                    ) : null}
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
                        <TableCell className="w-14 px-1 text-center align-middle">
                          {index + 1}
                        </TableCell>
                        {shouldShowAudioColumn ? (
                          <TableCell className="w-16 px-1 text-center align-middle">
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
                        <TableCell className="w-[24%] min-w-0 pl-2 align-middle font-medium">
                          <TextCellTooltip
                            value={item.name}
                            className="truncate"
                          />
                        </TableCell>
                        <TableCell className="w-[18%] align-middle text-center">
                          <TextCellTooltip
                            value={item.citizen_identification}
                            className="truncate text-center"
                          />
                        </TableCell>
                        <TableCell className="w-[16%] align-middle text-center">
                          <TextCellTooltip
                            value={item.phone_number}
                            className="truncate text-center"
                          />
                        </TableCell>
                        <TableCell className="w-[14%] align-middle text-center">
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
                        {shouldShowActionColumn ? (
                          <TableCell className="w-28 px-1 text-center align-middle">
                            <div className="flex items-center justify-center gap-1">
                              {typeof onRegisterItem === "function" ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="outline"
                                      className="size-8 rounded-full"
                                      onClick={() => onRegisterItem(item)}
                                      disabled={item.truth_source !== "AI"}
                                      aria-label={`Đăng ký giọng nói của ${audioLabel.personName}`}
                                    >
                                      <UserPlus className="size-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {item.truth_source === "AI"
                                      ? `Đăng ký giọng nói của ${audioLabel.personName}`
                                      : "Chỉ đăng ký nhanh cho danh tính AI chưa được đăng ký"}
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}

                              {typeof onDeleteItem === "function" ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="destructive"
                                      className="size-8 rounded-full"
                                      onClick={() =>
                                        item.user_id && onDeleteItem(item)
                                      }
                                      disabled={
                                        !item.user_id ||
                                        deletingUserId === item.user_id
                                      }
                                      aria-label={`Xóa hồ sơ của ${audioLabel.personName}`}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {!item.user_id
                                      ? "Chỉ xóa được hồ sơ đã đăng ký"
                                      : deletingUserId === item.user_id
                                        ? "Đang xóa hồ sơ"
                                        : `Xóa hồ sơ của ${audioLabel.personName}`}
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
                            </div>
                          </TableCell>
                        ) : null}
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
    </>
  );
}
