import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { LoaderCircle, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

interface VoiceMultiSearchFormProps {
  onFileSelected?: (file: File | null) => void;
}

export function VoiceMultiSearchForm({
  onFileSelected,
}: VoiceMultiSearchFormProps) {
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
    onFileSelected?.(values.audioFile);
    await identifyMutation.mutateAsync(values);
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Tra cứu 1-2 người</CardTitle>
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
                        field.onChange(file);
                        onFileSelected?.(file);
                      }}
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
                  Đang tra cứu...
                </>
              ) : (
                <>
                  <UsersRound className="mr-2 size-4" />
                  Tra cứu 1-2 người
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
