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
  identifyVoiceSchema,
  type IdentifyVoiceSchemaInput,
  type IdentifyVoiceSchemaOutput,
} from "../schemas/voice.schema";
import { useIdentifyVoice } from "../hooks/use-voice";
import { VoiceAudioDropzone } from "./voice-audio-dropzone";

export function VoiceIdentifyForm() {
  const identifyMutation = useIdentifyVoice();

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
                "Identify voice"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
