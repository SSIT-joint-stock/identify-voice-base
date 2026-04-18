import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type SubmitHandler,
} from "react-hook-form";
import { toast } from "sonner";
import { useNormalizeAudio } from "../hooks/use-normalize-audio";
import { useUploadVoice } from "../hooks/use-voice";
import {
  uploadVoiceSchema,
  type UploadVoiceSchemaInput,
  type UploadVoiceSchemaOutput,
} from "../schemas/voice.schema";
import type { VoiceIdentifyTwoItem } from "../types/voice.types";
import { VoiceAudioDropzone } from "./voice-audio-dropzone";
import { VoiceAudioPlayer } from "./voice-audio-player";

interface VoiceUploadFormProps {
  initialFile?: File | null;
  previewAudioUrl?: string | null;
  initialValues?: Partial<UploadVoiceSchemaInput>;
  initialStart?: number;
  initialEnd?: number;
  onUploadSuccess?: (data?: Partial<VoiceIdentifyTwoItem>) => void;
  onFileChange?: () => void;
  compact?: boolean;
  playerKey?: number;
}

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 50 }, (_, index) => String(currentYear - index));
}

const YEAR_OPTIONS = getYearOptions();

function getResetValues(
  initialFile: File | null,
  initialValues?: Partial<UploadVoiceSchemaInput>,
  initialStart?: number,
  initialEnd?: number,
) {
  return {
    name: initialValues?.name ?? "",
    citizenIdentification: initialValues?.citizenIdentification ?? "",
    phoneNumber: initialValues?.phoneNumber ?? "",
    hometown: initialValues?.hometown ?? "",
    job: initialValues?.job ?? "",
    passport: initialValues?.passport ?? "",
    criminalRecords: initialValues?.criminalRecords ?? [],
    audioFile: initialFile,
    start: initialStart,
    end: initialEnd,
  };
}

export function VoiceUploadForm({
  initialFile = null,
  previewAudioUrl = null,
  initialValues,
  initialStart,
  initialEnd,
  onUploadSuccess,
  onFileChange,
  compact = false,
  playerKey,
}: VoiceUploadFormProps) {
  const form = useForm<
    UploadVoiceSchemaInput,
    unknown,
    UploadVoiceSchemaOutput
  >({
    resolver: zodResolver(uploadVoiceSchema),
    defaultValues: getResetValues(
      initialFile,
      initialValues,
      initialStart,
      initialEnd,
    ),
  });

  const watchedAudioFile = useWatch({
    control: form.control,
    name: "audioFile",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "criminalRecords",
  });

  useEffect(() => {
    // Only reset form when file changes, not when segment changes

    form.reset(
      getResetValues(initialFile, initialValues, initialStart, initialEnd),
    );
  }, [initialEnd, initialFile, initialStart, initialValues, form]);

  const uploadMutation = useUploadVoice();
  const { fetchProtectedAudioBlob } = useNormalizeAudio();

  const onSubmit: SubmitHandler<UploadVoiceSchemaOutput> = async (values) => {
    try {
      let fileToUpload = values.audioFile;

      if (previewAudioUrl) {
        const audioBlob = await fetchProtectedAudioBlob(previewAudioUrl);
        const inferredType =
          audioBlob.type || values.audioFile?.type || "audio/wav";
        const extension =
          inferredType.split("/")[1]?.replace("mpeg", "mp3") || "wav";

        fileToUpload = new File([audioBlob], `enroll-source.${extension}`, {
          type: inferredType,
          lastModified: values.audioFile?.lastModified ?? 0,
        });
      }

      if (!fileToUpload) {
        toast.error("Vui lòng chọn file audio.");
        return;
      }

      const response = await uploadMutation.mutateAsync({
        ...values,
        audioFile: fileToUpload,
      });

      form.reset(
        getResetValues(initialFile, initialValues, initialStart, initialEnd),
      );

      onUploadSuccess?.({
        matched_voice_id: response.voice_id || "pending",
        name: values.name.trim(),
        citizen_identification: values.citizenIdentification.trim(),
        phone_number: values.phoneNumber.trim(),
        hometown: values.hometown.trim(),
        job: values.job.trim(),
        passport: values.passport.trim(),
        message: "Mới đăng ký",
        score: 1.0,
      });
    } catch {
      // useUploadVoice already handles the error toast
    }
  };

  const formContent = (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="audioFile"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>File audio</FormLabel>
              <FormControl>
                <VoiceAudioDropzone
                  value={field.value ?? null}
                  onChange={(file) => {
                    field.onChange(file);
                    onFileChange?.();
                  }}
                  disabled={uploadMutation.isPending}
                  error={fieldState.error?.message}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <VoiceAudioPlayer
          key={playerKey}
          file={previewAudioUrl ? null : (watchedAudioFile ?? null)}
          audioUrl={previewAudioUrl}
          title="Audio đăng ký"
        />

        {watchedAudioFile ? (
          <>
            <div className="grid animate-in gap-4 fade-in-0 slide-in-from-bottom-4 duration-300 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Họ tên <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập họ tên" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="citizenIdentification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CCCD</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập CCCD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập số điện thoại" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hometown"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quê quán</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập quê quán" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="job"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nghề nghiệp</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập nghề nghiệp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hộ chiếu</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập số hộ chiếu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <FormLabel>Tiền án tiền sự</FormLabel>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ case: "", year: "" })}
                >
                  <Plus className="mr-2 size-4" />
                  Thêm mục
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Chưa có mục nào.
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((fieldItem, index) => (
                    <div
                      key={fieldItem.id}
                      className="grid gap-4 rounded-xl border p-4 md:grid-cols-[1fr_180px_auto]"
                    >
                      <FormField
                        control={form.control}
                        name={`criminalRecords.${index}.case`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nội dung</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ví dụ: Tội trộm cắp"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`criminalRecords.${index}.year`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Năm</FormLabel>
                            <FormControl>
                              <select
                                value={field.value}
                                onChange={field.onChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                              >
                                <option value="">Chọn năm</option>
                                {YEAR_OPTIONS.map((year) => (
                                  <option key={year} value={year}>
                                    {year}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => remove(index)}
                          className="w-full md:w-auto"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Xóa
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={uploadMutation.isPending}
              className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300 delay-100 bg-primary-50 text-primary-500 shadow-none hover:-translate-y-0.5 hover:bg-primary-50 hover:text-primary-500 hover:shadow-md hover:shadow-primary-100"
            >
              {uploadMutation.isPending ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Đang xử lý đăng ký...
                </>
              ) : (
                "Hoàn Thành Đăng Ký Giọng Nói"
              )}
            </Button>
          </>
        ) : null}
      </form>
    </Form>
  );

  if (compact) {
    return <div className="space-y-6">{formContent}</div>;
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Đăng ký giọng nói</CardTitle>
      </CardHeader>

      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
