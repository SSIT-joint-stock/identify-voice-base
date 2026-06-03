import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { voiceApi } from "@/feature/voice/api/voice.api";
import { formatError, TRANSLATE_JOB_POLL_INTERVAL_MS, wait } from "@/utils";

interface SpeechToTextJobResult {
  transcript: string | null;
  detected_language: string | null;
}

interface RunSpeechToTextJobOptions {
  key: string;
  backgroundMessage?: string;
  successMessage?: string;
  onViewResult?: () => void;
}

export function useSpeechToTextJob() {
  const requestIdRef = useRef(0);
  const dialogOpenRef = useRef(false);
  const backgroundToastIdRef = useRef<string | number | null>(null);
  const resultCacheRef = useRef<Record<string, SpeechToTextJobResult>>({});
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SpeechToTextJobResult>({
    transcript: null,
    detected_language: null,
  });

  const isRunning = runningKey !== null;

  const dismissBackgroundToast = useCallback(() => {
    const toastId = backgroundToastIdRef.current;
    if (toastId !== null) {
      toast.dismiss(toastId);
      backgroundToastIdRef.current = null;
    }
  }, []);

  const setDialogOpen = useCallback(
    (open: boolean) => {
      dialogOpenRef.current = open;
      if (open) {
        dismissBackgroundToast();
      }
    },
    [dismissBackgroundToast],
  );

  const upsertBackgroundToast = useCallback(
    (message: string, progress: number) => {
      if (dialogOpenRef.current) return;

      const toastMessage = `${message} ${Math.max(0, Math.min(100, Math.round(progress)))}%`;
      backgroundToastIdRef.current = toast.loading(toastMessage, {
        id: backgroundToastIdRef.current ?? undefined,
      });
    },
    [],
  );

  const finishBackgroundToast = useCallback(
    (type: "success" | "error", message: string, onViewResult?: () => void) => {
      const toastId = backgroundToastIdRef.current;
      if (toastId === null) return;

      if (type === "success") {
        toast.success(message, {
          id: toastId,
          action: onViewResult
            ? {
                label: "Xem kết quả",
                onClick: onViewResult,
              }
            : undefined,
        });
      } else {
        toast.error(message, { id: toastId });
      }
      backgroundToastIdRef.current = null;
    },
    [],
  );

  const openCachedResult = useCallback((key: string) => {
    const cachedResult = resultCacheRef.current[key];
    if (!cachedResult) return false;

    setResult(cachedResult);
    setProgress(100);
    return true;
  }, []);

  const run = useCallback(
    async (file: File, options: RunSpeechToTextJobOptions) => {
      if (openCachedResult(options.key)) {
        return resultCacheRef.current[options.key];
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const isCurrentRequest = () => requestIdRef.current === requestId;
      const backgroundMessage =
        options.backgroundMessage ?? "Đang chạy S2T trong nền...";
      const successMessage =
        options.successMessage ?? "Đã xử lý xong nội dung ghi âm.";

      dismissBackgroundToast();
      setRunningKey(options.key);
      setProgress(0);
      setResult({ transcript: null, detected_language: null });

      try {
        const job = await voiceApi.createSpeechToTextJob(file);

        while (isCurrentRequest()) {
          const jobStatus = await voiceApi.getSpeechToTextJob(job.job_id);
          setProgress(jobStatus.progress);
          upsertBackgroundToast(backgroundMessage, jobStatus.progress);

          if (!isCurrentRequest()) return null;

          if (jobStatus.status === "completed") {
            const nextResult = voiceApi.normalizeSpeechToTextResult(
              jobStatus.result,
            );
            resultCacheRef.current[options.key] = nextResult;
            setResult(nextResult);
            setProgress(100);
            finishBackgroundToast(
              "success",
              successMessage,
              options.onViewResult,
            );
            return nextResult;
          }

          if (jobStatus.status === "failed") {
            throw new Error(jobStatus.error ?? "Không thể chạy S2T.");
          }

          await wait(TRANSLATE_JOB_POLL_INTERVAL_MS);
        }

        return null;
      } catch (error) {
        const message = formatError(error);
        setResult({ transcript: null, detected_language: null });
        setProgress(0);
        finishBackgroundToast("error", message);
        if (dialogOpenRef.current) {
          toast.error(message);
        }
        return null;
      } finally {
        if (isCurrentRequest()) {
          setRunningKey(null);
        }
      }
    },
    [
      dismissBackgroundToast,
      finishBackgroundToast,
      openCachedResult,
      upsertBackgroundToast,
    ],
  );

  return {
    isRunning,
    runningKey,
    progress,
    result,
    openCachedResult,
    run,
    setDialogOpen,
  };
}
