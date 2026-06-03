import { useCallback, useState } from "react";
import { toast } from "sonner";

import { voiceApi } from "@/feature/voice/api/voice.api";
import type { VoiceTranscriptDialogProps } from "@/feature/voice/components/voice-transcript-dialog";
import { useSpeechToTextJob } from "./use-speech-to-text-job";

interface OpenSpeechToTextFileParams {
  file: File;
  key: string;
  title: string;
  loadingText?: string;
  backgroundMessage?: string;
  successMessage?: string;
}

interface OpenSpeechToTextUrlParams extends Omit<
  OpenSpeechToTextFileParams,
  "file"
> {
  audioUrl: string;
  fileName: string;
}

interface UseVoiceSpeechToTextDialogOptions {
  loadAudioFileFromUrl?: (audioUrl: string, fileName: string) => Promise<File>;
}

export function useVoiceSpeechToTextDialog(
  options?: UseVoiceSpeechToTextDialogOptions,
) {
  const speechToTextJob = useSpeechToTextJob();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Nội dung ghi âm (S2T)");
  const [loadingText, setLoadingText] = useState("Đang chạy S2T...");
  const [loadingAudioKey, setLoadingAudioKey] = useState<string | null>(null);

  const loadAudioFileFromUrl =
    options?.loadAudioFileFromUrl ?? voiceApi.getAudioFileFromUrl;

  const openDialog = useCallback(
    (nextTitle: string) => {
      setTitle(nextTitle);
      setOpen(true);
      speechToTextJob.setDialogOpen(true);
    },
    [speechToTextJob],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      speechToTextJob.setDialogOpen(nextOpen);
    },
    [speechToTextJob],
  );

  const runFile = useCallback(
    (params: OpenSpeechToTextFileParams) => {
      openDialog(params.title);
      setLoadingText(params.loadingText ?? "Đang chạy S2T...");

      if (speechToTextJob.openCachedResult(params.key)) {
        return;
      }

      void speechToTextJob.run(params.file, {
        key: params.key,
        backgroundMessage: params.backgroundMessage,
        successMessage: params.successMessage,
        onViewResult: () => openDialog(params.title),
      });
    },
    [openDialog, speechToTextJob],
  );

  const runAudioUrl = useCallback(
    async (params: OpenSpeechToTextUrlParams) => {
      openDialog(params.title);
      setLoadingText(params.loadingText ?? "Đang tải audio...");

      if (speechToTextJob.openCachedResult(params.key)) {
        return;
      }

      setLoadingAudioKey(params.key);
      try {
        const file = await loadAudioFileFromUrl(
          params.audioUrl,
          params.fileName,
        );
        setLoadingText(params.loadingText ?? "Đang chạy S2T...");
        void speechToTextJob.run(file, {
          key: params.key,
          backgroundMessage: params.backgroundMessage,
          successMessage: params.successMessage,
          onViewResult: () => openDialog(params.title),
        });
      } catch (error) {
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải audio để chạy S2T.",
        );
      } finally {
        setLoadingAudioKey(null);
      }
    },
    [loadAudioFileFromUrl, openDialog, speechToTextJob],
  );

  const dialogProps: VoiceTranscriptDialogProps = {
    open,
    onOpenChange: handleOpenChange,
    title,
    transcript: speechToTextJob.result.transcript,
    detectedLanguage: speechToTextJob.result.detected_language,
    isLoading: loadingAudioKey !== null || speechToTextJob.isRunning,
    loadingText:
      loadingAudioKey !== null
        ? loadingText
        : `${loadingText} ${speechToTextJob.progress}%`,
  };

  return {
    dialogProps,
    isRunning: speechToTextJob.isRunning,
    loadingAudioKey,
    runningKey: speechToTextJob.runningKey,
    runFile,
    runAudioUrl,
  };
}
