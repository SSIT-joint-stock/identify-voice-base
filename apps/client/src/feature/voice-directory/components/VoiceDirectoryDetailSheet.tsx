import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QUERY_KEYS } from "@/constants";
import type { ApiError } from "@/types";

import { VoiceAudioPlayer } from "@/feature/voice/components/voice-audio-player";
import { voiceDirectoryApi } from "../api/voice-directory.api";
import {
  type UpdateVoiceDirectoryFormValues,
  updateVoiceDirectoryFormSchema,
} from "../schemas/voice-directory.schema";
import type { VoiceDirectoryDetail } from "../types/voice-directory.types";

function normalizeCriminalForForm(
  value: VoiceDirectoryDetail["criminal_record"],
): UpdateVoiceDirectoryFormValues["criminal_record"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (row): row is { case: string; year: number } =>
        row !== null &&
        typeof row === "object" &&
        typeof (row as { case?: unknown }).case === "string" &&
        typeof (row as { year?: unknown }).year === "number",
    )
    .map((row) => ({
      case: row.case,
      year: String(row.year),
    }));
}

function toUpdatePayload(values: UpdateVoiceDirectoryFormValues) {
  return {
    name: values.name.trim(),
    citizen_identification: values.citizen_identification?.trim() || undefined,
    phone_number: values.phone_number?.trim() || undefined,
    hometown: values.hometown?.trim() || undefined,
    job: values.job?.trim() || undefined,
    passport: values.passport?.trim() || undefined,
    criminal_record: values.criminal_record.map((row) => ({
      case: row.case.trim(),
      year: Number.parseInt(row.year, 10),
    })),
  };
}

export interface VoiceDirectoryDetailSheetProps {
  voiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeactivated: () => void;
}

export function VoiceDirectoryDetailSheet({
  voiceId,
  open,
  onOpenChange,
  onDeactivated,
}: VoiceDirectoryDetailSheetProps) {
  const queryClient = useQueryClient();
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);
  const [selectedAudioIds, setSelectedAudioIds] = useState<Set<string>>(
    () => new Set(),
  );

  const detailQuery = useQuery({
    queryKey: voiceId
      ? QUERY_KEYS.voice.directory.detail(voiceId)
      : ["voice", "directory", "detail", "none"],
    queryFn: () => voiceDirectoryApi.getVoiceDetail(voiceId!),
    enabled: Boolean(voiceId && open),
  });

  const sessionPreviewQuery = useQuery({
    queryKey: previewSessionId
      ? QUERY_KEYS.voice.sessionAudio(previewSessionId)
      : ["voice", "directory", "session", "none"],
    queryFn: () => voiceDirectoryApi.getSessionDetail(previewSessionId!),
    enabled: Boolean(previewSessionId),
  });

  const form = useForm<UpdateVoiceDirectoryFormValues>({
    resolver: zodResolver(updateVoiceDirectoryFormSchema),
    defaultValues: {
      name: "",
      citizen_identification: "",
      phone_number: "",
      hometown: "",
      job: "",
      passport: "",
      criminal_record: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "criminal_record",
  });

  const detail = detailQuery.data;

  useEffect(() => {
    if (!detail) return;
    form.reset({
      name: detail.name ?? "",
      citizen_identification: detail.citizen_identification ?? "",
      phone_number: detail.phone_number ?? "",
      hometown: detail.hometown ?? "",
      job: detail.job ?? "",
      passport: detail.passport ?? "",
      criminal_record: normalizeCriminalForForm(detail.criminal_record),
    });
    queueMicrotask(() => {
      setSelectedAudioIds(new Set());
      setPreviewSessionId(null);
    });
  }, [detail, form]);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!voiceId) throw new Error("Thiếu ID hồ sơ.");
      return voiceDirectoryApi.updateVoiceInfo(
        voiceId,
        toUpdatePayload(form.getValues()),
      );
    },
    onSuccess: () => {
      toast.success("Cập nhật thông tin cá nhân thành công.");
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.voice.directory.detail(voiceId!),
      });
      void queryClient.invalidateQueries({
        queryKey: ["voice", "directory", "list"],
      });
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as ApiError).message)
          : "Không thể cập nhật thông tin.";
      toast.error(msg);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => {
      if (!voiceId) throw new Error("Thiếu ID hồ sơ.");
      return voiceDirectoryApi.deactivateVoice(voiceId);
    },
    onSuccess: () => {
      toast.success(
        "Đã vô hiệu hóa hồ sơ. Hồ sơ sẽ không còn trong danh sách.",
      );
      setConfirmDeactivateOpen(false);
      onOpenChange(false);
      onDeactivated();
      void queryClient.invalidateQueries({
        queryKey: ["voice", "directory"],
      });
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as ApiError).message)
          : "Không thể vô hiệu hóa hồ sơ.";
      toast.error(msg);
    },
  });

  const embeddingMutation = useMutation({
    mutationFn: () => {
      const vid = detail?.voice_id ?? voiceId;
      if (!vid) throw new Error("Thiếu voice_id.");
      const ids = Array.from(selectedAudioIds);
      if (ids.length === 0) throw new Error("Chọn ít nhất một mẫu âm thanh.");
      return voiceDirectoryApi.updateVoiceFromAudios(vid, ids);
    },
    onSuccess: (data) => {
      toast.success(
        `Đã đưa yêu cầu cập nhật đặc trưng vào hàng đợi. Job: ${data.job_id}`,
      );
      setSelectedAudioIds(new Set());
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.voice.directory.detail(voiceId!),
      });
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as ApiError).message)
          : "Không thể khởi tạo cập nhật đặc trưng.";
      toast.error(msg);
    },
  });

  const toggleAudioSelection = (audioFileId: string) => {
    setSelectedAudioIds((prev) => {
      const next = new Set(prev);
      if (next.has(audioFileId)) next.delete(audioFileId);
      else next.add(audioFileId);
      return next;
    });
  };

  const historyRows = detail?.identify_history ?? [];

  const enrollAudioUrl = detail?.audio_url?.trim() || null;
  const hasEnrollStreamUrl = Boolean(enrollAudioUrl);

  const sheetTitle = useMemo(() => {
    if (!detail) return "Chi tiết hồ sơ";
    return detail.name || "Chi tiết hồ sơ";
  }, [detail]);
  console.log(historyRows);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-xl md:max-w-6xl"
          showCloseButton
        >
          <SheetHeader className="shrink-0 border-b pb-4 text-left">
            <SheetTitle>{sheetTitle}</SheetTitle>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
            {detailQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Đang tải chi tiết…
              </div>
            ) : detailQuery.isError ? (
              <p className="text-sm text-destructive">
                Không tải được chi tiết hồ sơ. Thử đóng và mở lại.
              </p>
            ) : detail ? (
              <>
                <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
                  <h3 className="text-sm font-semibold">Mẫu giọng đăng ký</h3>
                  {hasEnrollStreamUrl ? (
                    <div className="flex flex-col gap-3">
                      <VoiceAudioPlayer
                        file={null}
                        audioUrl={enrollAudioUrl}
                        fileName={`${detail.name || "voice-sample"}.wav`}
                        compact
                      />
                      {!detail.audio_available ? (
                        <p className="text-xs text-amber-800">
                          API báo file có thể không có trên disk cục bộ; vẫn thử
                          phát qua URL nếu CDN còn file.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Không có mẫu audio đăng ký.
                    </p>
                  )}
                </section>

                <form
                  className="space-y-4"
                  onSubmit={form.handleSubmit(() => updateMutation.mutate())}
                >
                  <h3 className="text-sm font-semibold">Thông tin cá nhân</h3>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="vd-name">Họ và tên</Label>
                      <Input id="vd-name" {...form.register("name")} />
                      {form.formState.errors.name ? (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.name.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vd-cccd">CCCD / CMND</Label>
                      <Input
                        id="vd-cccd"
                        {...form.register("citizen_identification")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vd-phone">Điện thoại</Label>
                      <Input id="vd-phone" {...form.register("phone_number")} />
                      {form.formState.errors.phone_number ? (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.phone_number.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vd-hometown">Quê quán</Label>
                      <Input id="vd-hometown" {...form.register("hometown")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vd-job">Nghề nghiệp</Label>
                      <Input id="vd-job" {...form.register("job")} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="vd-passport">Hộ chiếu</Label>
                      <Input id="vd-passport" {...form.register("passport")} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tiền án / tiền sự</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ case: "", year: "" })}
                      >
                        <Plus className="mr-1 size-4" />
                        Thêm dòng
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {fields.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Chưa có bản ghi.
                        </p>
                      ) : null}
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex flex-wrap items-end gap-4"
                        >
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Vụ việc</Label>
                            <Input
                              {...form.register(
                                `criminal_record.${index}.case`,
                              )}
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Năm</Label>
                            <Input
                              {...form.register(
                                `criminal_record.${index}.year`,
                              )}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-destructive hover:cursor-pointer hover:bg-red-50 hover:text-red-500 transition-colors duration-300"
                            onClick={() => remove(index)}
                            aria-label="Xóa dòng"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Đang lưu…
                      </>
                    ) : (
                      "Lưu thông tin"
                    )}
                  </Button>
                </form>

                <section className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-semibold">
                      Lịch sử nhận dạng (5 phiên gần nhất)
                    </h3>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={
                        embeddingMutation.isPending ||
                        selectedAudioIds.size === 0 ||
                        !detail.voice_id
                      }
                      onClick={() => embeddingMutation.mutate()}
                    >
                      {embeddingMutation.isPending ? (
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
                      {historyRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-muted-foreground"
                          >
                            Chưa có lịch sử nhận dạng.
                          </TableCell>
                        </TableRow>
                      ) : (
                        historyRows.map((row) => {
                          const aid = row.audio_file_id;
                          const selectable = Boolean(aid);
                          return (
                            <TableRow key={row.session_id}>
                              <TableCell>
                                {selectable ? (
                                  <input
                                    type="checkbox"
                                    className="size-4 accent-primary"
                                    checked={
                                      aid ? selectedAudioIds.has(aid) : false
                                    }
                                    onChange={() =>
                                      aid && toggleAudioSelection(aid)
                                    }
                                    aria-label="Chọn mẫu để cập nhật embedding"
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs">
                                {new Date(row.identified_at).toLocaleString(
                                  "vi-VN",
                                )}
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
                                  onClick={() =>
                                    setPreviewSessionId(row.session_id)
                                  }
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

                  {previewSessionId ? (
                    <div className="rounded-lg border bg-background p-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Audio đầu vào phiên {previewSessionId.slice(0, 8)}…
                      </p>
                      {sessionPreviewQuery.isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" />
                          Đang tải…
                        </div>
                      ) : sessionPreviewQuery.data?.audio_url ? (
                        <VoiceAudioPlayer
                          file={null}
                          audioUrl={sessionPreviewQuery.data.audio_url}
                          fileName={`session-${previewSessionId.slice(0, 8)}.wav`}
                          compact
                        />
                      ) : (
                        <p className="text-sm text-destructive">
                          Không lấy được URL phát phiên này.
                        </p>
                      )}
                    </div>
                  ) : null}
                </section>

                <div className="border-t pt-4">
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full sm:w-auto"
                    onClick={() => setConfirmDeactivateOpen(true)}
                  >
                    Vô hiệu hóa hồ sơ
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={confirmDeactivateOpen}
        onOpenChange={setConfirmDeactivateOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vô hiệu hóa hồ sơ?</DialogTitle>
            <DialogDescription>
              Hồ sơ sẽ ẩn khỏi danh sách và không còn dùng trong nhận dạng mới.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDeactivateOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deactivateMutation.isPending}
              onClick={() => deactivateMutation.mutate()}
            >
              {deactivateMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Xác nhận"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
