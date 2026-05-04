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
import {
  BrainCircuit,
  Database,
  Pencil,
  Play,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useState } from "react";

import { VoiceDirectoryDetailSheet } from "@/feature/voice-directory/components/VoiceDirectoryDetailSheet";
import type { UpdateVoiceInfoResponse } from "@/feature/voice-directory/types/voice-directory.types";

import type { VoiceIdentifyItem } from "../types/voice.types";
import { getVoiceScoreMeta } from "../utils/voice-score";
import { VoiceAudioPlayer } from "./voice-audio-player";

interface VoiceSpeakerMatchTableProps {
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

function getDetailVoiceId(item: VoiceIdentifyItem) {
  const candidate = item.matched_voice_id || item.voice_id || "";

  if (!candidate) return null;
  if (item.truth_source === "AI" || item.truth_source === "NONE") return null;

  return candidate;
}

function GenderPill({ gender }: { gender?: VoiceIdentifyItem["gender"] }) {
  if (gender === "MALE") {
    return (
      <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
        Nam
      </span>
    );
  }

  if (gender === "FEMALE") {
    return (
      <span className="inline-flex items-center rounded-md bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-700">
        Nữ
      </span>
    );
  }

  return <span className="text-xs text-slate-400">-</span>;
}

function AgePill({ age }: { age?: number }) {
  if (typeof age !== "number" || !Number.isFinite(age) || age <= 0) {
    return <span className="text-xs text-slate-400">-</span>;
  }

  return (
    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
      {age}
    </span>
  );
}

function SourcePill({
  source,
}: {
  source?: VoiceIdentifyItem["truth_source"];
}) {
  if (source === "BUSINESS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <Database className="size-3 text-emerald-500" />
        Đã đăng ký
      </span>
    );
  }

  if (source === "AI") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
        <BrainCircuit className="size-3 text-violet-500" />
        AI Core
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
      Không rõ
    </span>
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

export function VoiceSpeakerMatchTable({
  title,
  description,
  items,
  emptyText = "Không có dữ liệu.",
  speakerIndex = 0,
  onDeleteItem,
  deletingUserId = null,
  onRegisterItem,
}: VoiceSpeakerMatchTableProps) {
  const [audioDialog, setAudioDialog] = useState<AudioDialogState | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [itemOverrides, setItemOverrides] = useState<
    Record<string, Partial<VoiceIdentifyItem>>
  >({});

  const shouldShowQuickActions =
    typeof onDeleteItem === "function" || typeof onRegisterItem === "function";
  const shouldShowActionColumn =
    items.some((item) => Boolean(getDetailVoiceId(item))) ||
    shouldShowQuickActions;

  const handleProfileUpdated = (payload: UpdateVoiceInfoResponse) => {
    setItemOverrides((prev) => ({
      ...prev,
      [payload.id]: {
        ...prev[payload.id],
        name: payload.name,
        phone_number: payload.phone_number ?? undefined,
        job: payload.job ?? undefined,
        age: payload.age ?? undefined,
        gender: payload.gender ?? undefined,
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
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[780px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[11%] pr-3 pl-0 text-center whitespace-nowrap">
                      Audio
                    </TableHead>
                    <TableHead className="w-[22%] pl-2 whitespace-nowrap">
                      Họ và tên
                    </TableHead>
                    <TableHead className="w-[12%] px-1 text-center whitespace-nowrap">
                      Giới tính
                    </TableHead>
                    <TableHead className="w-[10%] px-1 text-center whitespace-nowrap">
                      Độ tuổi
                    </TableHead>
                    <TableHead className="w-[16%] px-1 text-center whitespace-nowrap">
                      Nguồn
                    </TableHead>
                    <TableHead className="w-[12%] px-1 text-center whitespace-nowrap">
                      Điểm số
                    </TableHead>
                    {shouldShowActionColumn ? (
                      <TableHead className="w-32 px-2 text-center whitespace-nowrap">
                        Thao tác
                      </TableHead>
                    ) : null}
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
                        <TableCell className="w-[11%] pr-3 pl-0 text-center align-middle">
                          {rowAudioUrl ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  className="mx-auto size-8 rounded-full border border-slate-200 bg-white text-slate-950 shadow-lg shadow-slate-200/80 transition-colors duration-200 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600"
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
                        <TableCell className="w-[22%] min-w-0 pl-2 align-middle font-medium">
                          <TextCellTooltip
                            value={displayItem.name}
                            className="truncate"
                          />
                        </TableCell>
                        <TableCell className="w-[12%] px-1 text-center align-middle">
                          <GenderPill gender={displayItem.gender} />
                        </TableCell>
                        <TableCell className="w-[10%] px-1 text-center align-middle">
                          <AgePill age={displayItem.age} />
                        </TableCell>
                        <TableCell className="w-[16%] px-1 text-center align-middle">
                          <SourcePill source={displayItem.truth_source} />
                        </TableCell>
                        <TableCell className="w-[12%] px-1 text-center align-middle">
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
                        {shouldShowActionColumn ? (
                          <TableCell className="w-32 px-2 text-center align-middle">
                            <div className="flex items-center justify-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-sm"
                                    className="size-8 rounded-full border-slate-200 text-slate-500 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-500 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
                                    onClick={() => {
                                      if (!detailVoiceId) return;
                                      setSelectedVoiceId(detailVoiceId);
                                      setDetailOpen(true);
                                    }}
                                    disabled={!detailVoiceId}
                                    aria-label={`Mở chi tiết hồ sơ của ${audioLabel.personName}`}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {detailVoiceId
                                    ? "Sửa hồ sơ"
                                    : "Chưa có định danh để chỉnh sửa"}
                                </TooltipContent>
                              </Tooltip>

                              {typeof onRegisterItem === "function" ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="outline"
                                      className="size-8 rounded-full"
                                      onClick={() =>
                                        onRegisterItem(displayItem)
                                      }
                                      disabled={
                                        displayItem.truth_source !== "AI"
                                      }
                                      aria-label={`Đăng ký giọng nói của ${audioLabel.personName}`}
                                    >
                                      <UserPlus className="size-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {displayItem.truth_source === "AI"
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
                                        displayItem.user_id &&
                                        onDeleteItem(displayItem)
                                      }
                                      disabled={
                                        !displayItem.user_id ||
                                        deletingUserId === displayItem.user_id
                                      }
                                      aria-label={`Xóa hồ sơ của ${audioLabel.personName}`}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {!displayItem.user_id
                                      ? "Chỉ xóa được hồ sơ đã đăng ký"
                                      : deletingUserId === displayItem.user_id
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
