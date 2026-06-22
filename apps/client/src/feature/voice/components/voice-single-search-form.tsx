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
import { LoaderCircle, Minus, Plus, Search } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { voiceApi } from "../api/voice.api";
import { useIdentifyVoice } from "../hooks/use-voice";
import {
  identifyVoiceSchema,
  type IdentifyVoiceSchemaInput,
  type IdentifyVoiceSchemaOutput,
} from "../schemas/voice.schema";
import { VoiceAudioDropzone } from "./voice-audio-dropzone";

interface VoiceSingleSearchFormProps {
  formId?: string;
  onFileSelected?: (file: File | null) => void;
  onPendingChange?: (pending: boolean) => void;
  showSubmitButton?: boolean;
  autoSubmitOnAudioChange?: boolean;
}

export interface VoiceSingleSearchFormHandle {
  replaceAudioFile: (
    file: File | null,
    options?: {
      suppressAutoSubmit?: boolean;
    },
  ) => void;
  submitCurrent: () => void;
}

function getAudioFileKey(file: File | null) {
  if (!file) return null;
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export const VoiceSingleSearchForm = forwardRef<
  VoiceSingleSearchFormHandle,
  VoiceSingleSearchFormProps
>(function VoiceSingleSearchForm(
  {
    formId,
    onFileSelected,
    onPendingChange,
    showSubmitButton = true,
    autoSubmitOnAudioChange = false,
  },
  ref,
) {
  const identifyMutation = useIdentifyVoice();
  const lastAutoSubmittedFileKeyRef = useRef<string | null>(null);
  const [isNormalizingAudio, setIsNormalizingAudio] = useState(false);

  const form = useForm<
    IdentifyVoiceSchemaInput,
    unknown,
    IdentifyVoiceSchemaOutput
  >({
    resolver: zodResolver(identifyVoiceSchema),
    defaultValues: {
      audioFile: null,
      topKRecords: 5,
    },
  });
  const audioFile = form.watch("audioFile");

  const applyAudioFile = useCallback(
    (
      file: File | null,
      options?: {
        suppressAutoSubmit?: boolean;
        shouldTouch?: boolean;
      },
    ) => {
      const fileKey = getAudioFileKey(file);

      if (options?.suppressAutoSubmit) {
        lastAutoSubmittedFileKeyRef.current = fileKey;
      } else if (!fileKey) {
        lastAutoSubmittedFileKeyRef.current = null;
      }

      form.setValue("audioFile", file, {
        shouldDirty: true,
        shouldTouch: options?.shouldTouch ?? true,
        shouldValidate: true,
      });
    },
    [form],
  );

  useEffect(() => {
    onPendingChange?.(identifyMutation.isPending || isNormalizingAudio);

    return () => {
      onPendingChange?.(false);
    };
  }, [identifyMutation.isPending, isNormalizingAudio, onPendingChange]);

  const normalizeAndSetAudioFile = async (file: File | null) => {
    if (!file) {
      applyAudioFile(null, { shouldTouch: false });
      onFileSelected?.(null);
      return;
    }

    setIsNormalizingAudio(true);
    onFileSelected?.(null);
    const toastId = toast.loading("Đang chuẩn hóa audio về WAV 16kHz mono...");

    try {
      const normalizedFile = await voiceApi.normalizeAudio(file);
      applyAudioFile(normalizedFile);
      onFileSelected?.(normalizedFile);
      toast.success("Đã chuẩn hóa audio.", { id: toastId });
    } catch {
      applyAudioFile(null, { shouldTouch: false });
      onFileSelected?.(null);
      toast.error("Không thể chuẩn hóa audio. Vui lòng kiểm tra file gốc.", {
        id: toastId,
      });
    } finally {
      setIsNormalizingAudio(false);
    }
  };

  const onSubmit = useCallback<SubmitHandler<IdentifyVoiceSchemaOutput>>(
    async (values) => {
      await identifyMutation.mutateAsync(values);
    },
    [identifyMutation],
  );

  useImperativeHandle(
    ref,
    () => ({
      replaceAudioFile: (file, options) => {
        applyAudioFile(file, {
          suppressAutoSubmit: options?.suppressAutoSubmit,
        });
      },
      submitCurrent: () => {
        void form.handleSubmit(onSubmit)();
      },
    }),
    [applyAudioFile, form, onSubmit],
  );

  useEffect(() => {
    const fileKey = getAudioFileKey(audioFile);

    if (!fileKey) {
      lastAutoSubmittedFileKeyRef.current = null;
      return;
    }

    if (
      !autoSubmitOnAudioChange ||
      identifyMutation.isPending ||
      isNormalizingAudio ||
      lastAutoSubmittedFileKeyRef.current === fileKey
    ) {
      return;
    }

    lastAutoSubmittedFileKeyRef.current = fileKey;
    void form.handleSubmit(onSubmit)();
  }, [
    audioFile,
    autoSubmitOnAudioChange,
    form,
    identifyMutation.isPending,
    isNormalizingAudio,
    onSubmit,
  ]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Tra cứu 1 người</CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            id={formId}
            className="space-y-6"
            onSubmit={form.handleSubmit(onSubmit)}
          >
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
                        void normalizeAndSetAudioFile(file);
                      }}
                      disabled={
                        identifyMutation.isPending || isNormalizingAudio
                      }
                      error={fieldState.error?.message}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="topKRecords"
              render={({ field }) => {
                const currentValue = Number(field.value);
                const isDisabled =
                  identifyMutation.isPending || isNormalizingAudio;
                const setTopKRecords = (value: number) => {
                  form.setValue("topKRecords", Math.max(1, value), {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                };

                return (
                  <FormItem className="max-w-lg">
                    <div>
                      <FormLabel>Số kết quả gần giống</FormLabel>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Mặc định 5, có thể nhập số bất kỳ.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-9 w-44 overflow-hidden rounded-md border bg-background focus-within:border-green-100 focus-within:ring-2 focus-within:ring-green-100">
                        <button
                          type="button"
                          aria-label="Giảm số kết quả"
                          className="flex w-10 shrink-0 items-center justify-center border-r text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={isDisabled || currentValue <= 1}
                          onClick={() => setTopKRecords(currentValue - 1)}
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            inputMode="numeric"
                            value={
                              field.value === undefined
                                ? ""
                                : String(field.value)
                            }
                            onChange={field.onChange}
                            placeholder="5"
                            aria-label="Số kết quả gần giống"
                            className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent text-center font-semibold tabular-nums shadow-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            disabled={isDisabled}
                          />
                        </FormControl>
                        <button
                          type="button"
                          aria-label="Tăng số kết quả"
                          className="flex w-10 shrink-0 items-center justify-center border-l text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={isDisabled}
                          onClick={() =>
                            setTopKRecords(
                              Number.isFinite(currentValue)
                                ? currentValue + 1
                                : 1,
                            )
                          }
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {[5, 10, 20, 50, 100].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            disabled={isDisabled}
                            aria-pressed={currentValue === preset}
                            className={`rounded-md px-2 py-1 font-medium tabular-nums transition-colors disabled:opacity-40 ${
                              currentValue === preset
                                ? "bg-green-50 text-green-500"
                                : "hover:bg-green-50 hover:text-green-500"
                            }`}
                            onClick={() => setTopKRecords(preset)}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {showSubmitButton && audioFile ? (
              <Button
                type="submit"
                disabled={identifyMutation.isPending || isNormalizingAudio}
              >
                {identifyMutation.isPending || isNormalizingAudio ? (
                  <>
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                    {isNormalizingAudio
                      ? "Đang chuẩn hóa..."
                      : "Đang tra cứu..."}
                  </>
                ) : (
                  <>
                    <Search className="mr-2 size-4" />
                    Tra cứu 1 người
                  </>
                )}
              </Button>
            ) : null}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
});
