import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { LoaderCircle } from "lucide-react";
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
  identifyTwoVoiceSchema,
  type IdentifyTwoVoiceSchemaInput,
  type IdentifyTwoVoiceSchemaOutput,
} from "../schemas/voice.schema";
import { useIdentifyTwoVoice } from "../hooks/use-voice";
import { VoiceAudioDropzone } from "./voice-audio-dropzone";

export function VoiceIdentifyTwoForm() {
  const identifyMutation = useIdentifyTwoVoice();

  const form = useForm<
    IdentifyTwoVoiceSchemaInput,
    unknown,
    IdentifyTwoVoiceSchemaOutput
  >({
    resolver: zodResolver(identifyTwoVoiceSchema),
    defaultValues: {
      audioFile: null,
    },
  });

  const onSubmit: SubmitHandler<IdentifyTwoVoiceSchemaOutput> = async (
    values
  ) => {
    await identifyMutation.mutateAsync(values);
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Nhận diện 1-2 người nói</CardTitle>
        <CardDescription>
          Upload một file audio chứa tối đa 2 người nói. Nếu vượt ngoài giới
          hạn, hệ thống sẽ báo lỗi.
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
                      onChange={field.onChange}
                      disabled={identifyMutation.isPending}
                      error={fieldState.error?.message}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={identifyMutation.isPending}>
              {identifyMutation.isPending ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Đang nhận diện...
                </>
              ) : (
                "Identify 2 voice"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
