import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Loader2,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
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

import { voiceApi } from "@/feature/voice/api/voice.api";
import { VoiceAudioPlayer } from "@/feature/voice/components/voice-audio-player";
import { useNormalizeAudio } from "@/feature/voice/hooks/use-normalize-audio";
import { voiceDirectoryApi } from "../api/voice-directory.api";
import {
  type UpdateVoiceDirectoryFormValues,
  updateVoiceDirectoryFormSchema,
} from "../schemas/voice-directory.schema";
import type {
  UpdateVoiceInfoResponse,
  VoiceDirectoryDetail,
} from "../types/voice-directory.types";
import { VoiceDuplicateMatchesDialog } from "./VoiceDuplicateMatchesDialog";

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

function toNullableTrimmedValue(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

function toUpdatePayload(values: UpdateVoiceDirectoryFormValues) {
  return {
    name: values.name.trim(),
    citizen_identification: toNullableTrimmedValue(
      values.citizen_identification,
    ),
    phone_number: toNullableTrimmedValue(values.phone_number),
    hometown: toNullableTrimmedValue(values.hometown),
    job: toNullableTrimmedValue(values.job),
    passport: toNullableTrimmedValue(values.passport),
    age: values.age ? Number(values.age) : null,
    gender: values.gender || null,
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
  onUpdated?: (payload: UpdateVoiceInfoResponse) => void;
}

export function VoiceDirectoryDetailSheet({
  voiceId,
  open,
  onOpenChange,
  onDeactivated,
  onUpdated,
}: VoiceDirectoryDetailSheetProps) {
  const queryClient = useQueryClient();
  const { fetchProtectedAudioBlob } = useNormalizeAudio();
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [confirmDenoiseOpen, setConfirmDenoiseOpen] = useState(false);
  const [denoisePreviewOpen, setDenoisePreviewOpen] = useState(false);
  const [filteredEnrollAudioFile, setFilteredEnrollAudioFile] =
    useState<File | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
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
      age: "",
      gender: "",
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
      age:
        typeof detail.age === "number" && detail.age > 0
          ? String(detail.age)
          : "",
      gender:
        detail.gender === "MALE" || detail.gender === "FEMALE"
          ? detail.gender
          : "",
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
    onSuccess: (payload) => {
      onUpdated?.(payload);
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

  const deleteVoiceMutation = useMutation({
    mutationFn: () => {
      if (!voiceId) throw new Error("Thiếu ID hồ sơ.");
      return voiceDirectoryApi.deleteVoice(voiceId);
    },
    onSuccess: () => {
      toast.success("Đã xóa hồ sơ. Hồ sơ sẽ không còn trong danh sách.");
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
          : "Không thể xóa hồ sơ.";
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

  const denoiseEnrollAudioMutation = useMutation({
    mutationFn: () => {
      if (!voiceId) throw new Error("Thiếu ID hồ sơ.");
      if (!filteredEnrollAudioFile) {
        throw new Error("Chưa có audio lọc ồn để cập nhật.");
      }
      return voiceDirectoryApi.denoiseEnrollAudio(
        voiceId,
        filteredEnrollAudioFile,
      );
    },
    onSuccess: () => {
      toast.success("Đã lọc ồn và cập nhật audio đăng ký.");
      setConfirmDenoiseOpen(false);
      setDenoisePreviewOpen(false);
      setFilteredEnrollAudioFile(null);
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.voice.directory.detail(voiceId!),
      });
      void queryClient.invalidateQueries({
        queryKey: ["voice", "directory"],
      });
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as ApiError).message)
          : "Không thể lọc ồn audio đăng ký.";
      toast.error(msg);
    },
  });

  const denoisePreviewMutation = useMutation({
    mutationFn: async () => {
      if (!enrollAudioUrl) throw new Error("Không có audio đăng ký.");

      const sourceBlob = await fetchProtectedAudioBlob(enrollAudioUrl);
      const sourceFile = new File(
        [sourceBlob],
        `${detail?.name || "voice-sample"}.wav`,
        {
          type: sourceBlob.type || "audio/wav",
        },
      );

      return voiceApi.filterNoise(sourceFile);
    },
    onSuccess: (file) => {
      setFilteredEnrollAudioFile(file);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as ApiError).message)
          : "Không thể tạo audio lọc ồn.";
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
  const handleSheetOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDuplicateDialogOpen(false);
      setDenoisePreviewOpen(false);
      setConfirmDenoiseOpen(false);
      setFilteredEnrollAudioFile(null);
    }

    onOpenChange(nextOpen);
  };

  const openDenoisePreview = () => {
    setDenoisePreviewOpen(true);
    setFilteredEnrollAudioFile(null);
    denoisePreviewMutation.mutate();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-xl md:max-w-4xl"
          showCloseButton
        >
          <SheetHeader className="shrink-0 border-b pb-4 text-left">
            <SheetTitle>{sheetTitle}</SheetTitle>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
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
                <section className="space-y-3 rounded-xl ">
                  <h3 className="text-sm font-semibold">Mẫu giọng đăng ký</h3>
                  {hasEnrollStreamUrl ? (
                    <div className="flex flex-col gap-3">
                      <VoiceAudioPlayer
                        file={null}
                        audioUrl={enrollAudioUrl}
                        fileName={`${detail.name || "voice-sample"}.wav`}
                        compact
                      />
                      {/* {!detail.audio_available ? (
                        <p className="text-xs text-amber-800">
                          API báo file có thể không có trên disk cục bộ; vẫn thử phát qua URL nếu
                          CDN còn file.
                        </p>
                      ) : null} */}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Không có mẫu audio đăng ký.
                    </p>
                  )}
                </section>
                <div className="flex flex-col gap-2 py-1 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={
                      !hasEnrollStreamUrl ||
                      denoiseEnrollAudioMutation.isPending ||
                      denoisePreviewMutation.isPending
                    }
                    onClick={openDenoisePreview}
                  >
                    {denoiseEnrollAudioMutation.isPending ||
                    denoisePreviewMutation.isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 size-4" />
                    )}
                    Lọc ồn audio đăng ký
                  </Button>
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={!hasEnrollStreamUrl}
                    onClick={() => setDuplicateDialogOpen(true)}
                  >
                    <Users className="mr-2 size-4" />
                    Xem những hồ sơ có giọng trùng
                  </Button>
                </div>
                <form
                  className="space-y-4"
                  onSubmit={form.handleSubmit(() => updateMutation.mutate())}
                >
                  <h3 className="text-sm font-semibold">Thông tin cá nhân</h3>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="vd-name">Họ và tên</Label>
                      <Input
                        id="vd-name"
                        placeholder="Nhập họ tên"
                        {...form.register("name")}
                      />
                      {form.formState.errors.name ? (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.name.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vd-cccd">CCCD</Label>
                      <Input
                        id="vd-cccd"
                        placeholder="Nhập CCCD"
                        {...form.register("citizen_identification")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vd-phone">Số điện thoại</Label>
                      <Input
                        id="vd-phone"
                        inputMode="tel"
                        placeholder="Nhập số điện thoại"
                        {...form.register("phone_number")}
                      />
                      {form.formState.errors.phone_number ? (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.phone_number.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vd-gender">Giới tính</Label>
                      <select
                        id="vd-gender"
                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        {...form.register("gender")}
                      >
                        <option value="">Chọn giới tính</option>
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vd-age">Độ tuổi</Label>
                      <Input
                        id="vd-age"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Nhập tuổi"
                        {...form.register("age", {
                          onChange: (event) => {
                            event.target.value = event.target.value.replace(
                              /\D/g,
                              "",
                            );
                          },
                        })}
                      />
                      {form.formState.errors.age ? (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.age.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vd-hometown">Quê quán</Label>
                      <Input
                        id="vd-hometown"
                        placeholder="Nhập quê quán"
                        {...form.register("hometown")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vd-job">Nghề nghiệp</Label>
                      <Input
                        id="vd-job"
                        placeholder="Nhập nghề nghiệp"
                        {...form.register("job")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vd-passport">Hộ chiếu</Label>
                      <Input
                        id="vd-passport"
                        placeholder="Nhập số hộ chiếu"
                        {...form.register("passport")}
                      />
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
                              placeholder="Ví dụ: Tội trộm cắp"
                              {...form.register(
                                `criminal_record.${index}.case`,
                              )}
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Năm</Label>
                            <Input
                              placeholder="Nhập năm"
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
                <hr />
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
                          const isPreviewing =
                            previewSessionId === row.session_id;
                          return (
                            <Fragment key={row.session_id}>
                              <TableRow>
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
                                  {row.score != null
                                    ? row.score.toFixed(4)
                                    : "—"}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() =>
                                      setPreviewSessionId((current) =>
                                        current === row.session_id
                                          ? null
                                          : row.session_id,
                                      )
                                    }
                                  >
                                    <Play className="size-3" />
                                    Nghe
                                  </Button>
                                </TableCell>
                              </TableRow>

                              {isPreviewing ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="py-3">
                                    <div className="relative rounded-lg border bg-background p-3 pr-12">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 size-8 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                                        onClick={() =>
                                          setPreviewSessionId(null)
                                        }
                                        aria-label="Đóng audio"
                                      >
                                        <X className="size-4" />
                                      </Button>

                                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                                        Audio đầu vào phiên{" "}
                                        {row.session_id.slice(0, 8)}…
                                      </p>
                                      {sessionPreviewQuery.isLoading ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                          <Loader2 className="size-4 animate-spin" />
                                          Đang tải…
                                        </div>
                                      ) : sessionPreviewQuery.data
                                          ?.audio_url ? (
                                        <VoiceAudioPlayer
                                          file={null}
                                          audioUrl={
                                            sessionPreviewQuery.data.audio_url
                                          }
                                          fileName={`session-${row.session_id.slice(0, 8)}.wav`}
                                          compact
                                        />
                                      ) : (
                                        <p className="text-sm text-destructive">
                                          Không lấy được URL phát phiên này.
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : null}
                            </Fragment>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </section>

                <div className="border-t pt-4">
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full sm:w-auto"
                    onClick={() => setConfirmDeactivateOpen(true)}
                  >
                    Xóa hồ sơ
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {duplicateDialogOpen ? (
        <VoiceDuplicateMatchesDialog
          open={duplicateDialogOpen}
          onOpenChange={setDuplicateDialogOpen}
          audioUrl={enrollAudioUrl}
          currentUserId={detail?.id}
          currentVoiceId={detail?.voice_id}
          currentName={detail?.name}
        />
      ) : null}

      <Dialog
        open={confirmDeactivateOpen}
        onOpenChange={setConfirmDeactivateOpen}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Xóa hồ sơ?</DialogTitle>
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
              disabled={deleteVoiceMutation.isPending}
              onClick={() => deleteVoiceMutation.mutate()}
            >
              {deleteVoiceMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Xác nhận"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={denoisePreviewOpen}
        onOpenChange={(nextOpen) => {
          setDenoisePreviewOpen(nextOpen);
          if (!nextOpen) {
            setFilteredEnrollAudioFile(null);
          }
        }}
      >
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>So sánh audio đăng ký</DialogTitle>
            <DialogDescription>
              Nghe lại audio nguồn và audio đã lọc ồn trước khi quyết định cập
              nhật mẫu giọng đăng ký.
            </DialogDescription>
          </DialogHeader>

          <div className="relative grid gap-6 lg:grid-cols-2 lg:gap-12">
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden -translate-x-1/2 items-center justify-center lg:flex">
              <ArrowRight className="size-8 text-muted-foreground/80" />
            </div>

            <div className="space-y-4">
              <div className="space-y-4 rounded-2xl border p-4">
                <p className="font-medium">Audio nguồn</p>
                <VoiceAudioPlayer
                  file={null}
                  audioUrl={enrollAudioUrl}
                  fileName={`${detail?.name || "voice-sample"}.wav`}
                  title="Audio nguồn"
                  compact
                />
              </div>
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  disabled={denoiseEnrollAudioMutation.isPending}
                  onClick={() => {
                    setFilteredEnrollAudioFile(null);
                    setDenoisePreviewOpen(false);
                  }}
                >
                  Dùng audio nguồn
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-4 rounded-2xl border p-4">
                <p className="font-medium">Audio đã lọc ồn</p>
                {denoisePreviewMutation.isPending ? (
                  <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Đang lọc audio đăng ký...
                  </div>
                ) : filteredEnrollAudioFile ? (
                  <VoiceAudioPlayer
                    file={filteredEnrollAudioFile}
                    title="Audio đã lọc ồn"
                    compact
                  />
                ) : (
                  <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed px-4 text-center text-sm text-muted-foreground">
                    Không thể tạo audio đã lọc. Đóng dialog và thử lại.
                  </div>
                )}
              </div>
              <div className="flex justify-center">
                <Button
                  type="button"
                  disabled={
                    !filteredEnrollAudioFile ||
                    denoisePreviewMutation.isPending ||
                    denoiseEnrollAudioMutation.isPending
                  }
                  onClick={() => setConfirmDenoiseOpen(true)}
                >
                  Dùng audio đã lọc
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDenoiseOpen} onOpenChange={setConfirmDenoiseOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Lọc ồn audio đăng ký?</DialogTitle>
            <DialogDescription className="space-y-3 text-sm leading-relaxed">
              <p>
                Lọc ồn có thể loại bỏ một phần âm thanh thô và đặc trưng giọng
                tự nhiên của người nói. Trong một số trường hợp, việc này có thể
                làm kết quả định danh giảm đáng kể.
              </p>

              <p className="font-semibold">
                Chỉ tiếp tục nếu mẫu hiện tại bị nhiễu nhiều và bạn chấp nhận
                rủi ro này.
              </p>

              <div className="border rounded-md p-3 bg-muted/20">
                <p className="font-semibold mb-1">Lưu ý quan trọng:</p>
                <p>
                  Hiện tại hệ thống AI Core{" "}
                  <span className="font-semibold">
                    chưa hỗ trợ API cập nhật lại voice embedding
                  </span>{" "}
                  khi bạn thay đổi mẫu giọng nói.
                </p>
                <p className="mt-2">
                  Điều này có nghĩa là nếu bạn cập nhật voice bằng file audio đã
                  lọc ồn, dữ liệu giọng nói trong database backend sẽ được cập
                  nhật, nhưng{" "}
                  <span className="font-semibold">
                    vector embedding đang lưu trong AI Core sẽ không thay đổi
                  </span>
                  .
                </p>
                <p className="mt-2">
                  Sự không đồng bộ này có thể dẫn đến sai lệch trong quá trình
                  định danh sau này.
                </p>
              </div>

              <p className="font-semibold text-destructive">
                Vui lòng chỉ tiếp tục khi bạn thực sự chắc chắn muốn sử dụng mẫu
                giọng đã lọc ồn và chấp nhận rủi ro trên.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={denoiseEnrollAudioMutation.isPending}
              onClick={() => setConfirmDenoiseOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={denoiseEnrollAudioMutation.isPending}
              onClick={() => denoiseEnrollAudioMutation.mutate()}
            >
              {denoiseEnrollAudioMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Xác nhận lọc ồn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
