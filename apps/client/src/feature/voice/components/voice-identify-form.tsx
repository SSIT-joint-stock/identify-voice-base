import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  identifyVoiceSchema,
  type IdentifyVoiceSchemaInput,
  type IdentifyVoiceSchemaOutput,
} from "../schemas/voice.schema";
import { useIdentifyVoice } from "../hooks/use-voice";
import { VoiceAudioDropzone } from "./voice-audio-dropzone";
import { voiceApi } from "../api/voice.api";

export function VoiceIdentifyForm() {
  const identifyMutation = useIdentifyVoice();
  const [isNormalizingAudio, setIsNormalizingAudio] = useState(false);

  const form = useForm<
    IdentifyVoiceSchemaInput,
    unknown,
    IdentifyVoiceSchemaOutput
  >({
    resolver: zodResolver(identifyVoiceSchema),
    defaultValues: {
      audioFile: null,
    },
  });

  const onSubmit: SubmitHandler<IdentifyVoiceSchemaOutput> = async (values) => {
    await identifyMutation.mutateAsync(values);
  };

  const normalizeAndSetAudioFile = async (file: File | null) => {
    if (!file) {
      form.setValue("audioFile", null, { shouldValidate: true });
      return;
    }

    setIsNormalizingAudio(true);
    const toastId = toast.loading("Đang chuẩn hóa audio về WAV 16kHz mono...");

    try {
      const normalizedFile = await voiceApi.normalizeAudio(file);
      form.setValue("audioFile", normalizedFile, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      toast.success("Đã chuẩn hóa audio.", { id: toastId });
    } catch {
      form.setValue("audioFile", null, { shouldValidate: true });
      toast.error("Không thể chuẩn hóa audio. Vui lòng kiểm tra file gốc.", {
        id: toastId,
      });
    } finally {
      setIsNormalizingAudio(false);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Nhận diện 1 người nói</CardTitle>
        <CardDescription>
          Upload một file audio và lấy ra top 5 người giống nhất theo điểm số.
        </CardDescription>
      </CardHeader>

      <CardContent>
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

            <Button
              type="submit"
              disabled={identifyMutation.isPending || isNormalizingAudio}
            >
              {identifyMutation.isPending || isNormalizingAudio ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  {isNormalizingAudio
                    ? "Đang chuẩn hóa..."
                    : "Đang nhận diện..."}
                </>
              ) : (
                "Identify voice"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
