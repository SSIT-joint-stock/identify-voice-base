import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { translateApi } from "@/feature/translate/api/translate.api";
import {
  AUTO_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  OCR_LANGUAGES,
  SPEECH_LANGUAGES,
} from "@/feature/translate/constants/translate.constants";
import { useAuthStore } from "@/store/auth.store";
import {
  animateProgressTo,
  formatError,
  getDetectedLanguageCode,
  TRANSLATE_JOB_POLL_INTERVAL_MS,
  wait,
  type ProcessingStep,
} from "@/utils";
import type {
  SelectedTranslateFile,
  SpeechToTextResponse,
  TranslateMode,
} from "../types/translate.types";
import {
  getLanguageLabel,
  getOcrText,
  getTranscriptText,
} from "../utils/translate-file.utils";
import { useDownloadTranslatedFile } from "./use-download-translated-file";
import { useTranslationAutoScroll } from "./use-translation-auto-scroll";

const EDIT_TRANSLATION_PERMISSION = "translate.history.update";

function getOcrRequestLanguage(language: string) {
  if (language === AUTO_LANGUAGE) return undefined;

  return OCR_LANGUAGES.some((option) => option.value === language)
    ? language
    : undefined;
}

function getSupportedSourceLanguage(
  languageCode: string | null,
  isAudio: boolean,
) {
  if (!languageCode) return null;

  const supportedLanguages = isAudio ? SPEECH_LANGUAGES : OCR_LANGUAGES;
  const normalizedLanguage = languageCode.trim().toLowerCase();

  if (["zh-cn", "zh-hans", "cmn"].includes(normalizedLanguage)) {
    return supportedLanguages.some((language) => language.value === "zh")
      ? "zh"
      : null;
  }

  return (
    supportedLanguages.find(
      (language) => language.value.toLowerCase() === normalizedLanguage,
    )?.value ?? null
  );
}

function getSelectedFileType(file?: SelectedTranslateFile | null) {
  const fileName = file?.file.name.trim().toLowerCase();
  const extension = fileName?.match(/\.([^.]+)$/)?.[1];

  return extension || file?.kind || "text";
}

function getSourceLanguageOptionsByKind(kind?: SelectedTranslateFile["kind"]) {
  return kind === "audio" ? SPEECH_LANGUAGES : OCR_LANGUAGES;
}

export function useTranslateFileController() {
  const currentUser = useAuthStore((state) => state.user);
  const translateOptionsRef = useRef<HTMLDivElement | null>(null);
  const translateProgressRef = useRef(0);
  const translateRequestIdRef = useRef(0);
  const autoExtractedAudioFileRef = useRef<File | null>(null);
  const hasUserSelectedSourceLanguageRef = useRef(false);
  const [selectedFile, setSelectedFile] =
    useState<SelectedTranslateFile | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState(AUTO_LANGUAGE);
  const [detectedSourceLanguage, setDetectedSourceLanguage] = useState<
    string | null
  >(null);
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_TARGET_LANGUAGE);
  const [returnTimestamp, setReturnTimestamp] = useState(false);
  const [denoiseAudio, setDenoiseAudio] = useState(false);
  const [mode, setMode] = useState<TranslateMode>("translate");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [savedTranslatedText, setSavedTranslatedText] = useState("");
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle");
  const [translateProgress, setTranslateProgress] = useState(0);
  const [visibleIsLoadingAudio, setVisibleIsLoadingAudio] = useState(false);
  const [isSavingEditedTranslation, setIsSavingEditedTranslation] =
    useState(false);

  const isBusy = processingStep !== "idle";
  const isAudio = selectedFile?.kind === "audio";
  const hasFile = Boolean(selectedFile);
  const hasSourceText = sourceText.trim().length > 0;
  const hasTranslatedText = translatedText.trim().length > 0;
  const outputTitle = mode === "summarize" ? "Bản dịch tóm tắt" : "Bản dịch";
  const exportFilename = useMemo(() => {
    const sourceName = selectedFile?.file.name.replace(/\.[^.]+$/, "").trim();
    const prefix = mode === "summarize" ? "ban-dich-tom-tat" : "ban-dich";

    return sourceName ? `${prefix}-${sourceName}` : prefix;
  }, [mode, selectedFile]);
  const { downloadTranslatedFile, exportingFormat } = useDownloadTranslatedFile(
    {
      filename: exportFilename,
      text: translatedText,
      title: outputTitle,
    },
  );
  const canUpdateTranslationHistory =
    currentUser?.permissions.includes(EDIT_TRANSLATION_PERMISSION) ?? false;
  const canSaveTranslationEdit =
    canUpdateTranslationHistory && Boolean(historyRecordId);
  const hasPendingTranslationEdit =
    canSaveTranslationEdit && translatedText !== savedTranslatedText;
  const sourceAutoScroll = useTranslationAutoScroll({
    enabled: processingStep === "extracting",
    text: sourceText,
  });
  const translatedAutoScroll = useTranslationAutoScroll({
    enabled: processingStep === "translating",
    text: translatedText,
  });

  const updateTranslateProgress = useCallback((progress: number) => {
    translateProgressRef.current = progress;
    setTranslateProgress(progress);
  }, []);

  const resetTranslatedResult = useCallback(() => {
    setTranslatedText("");
    setSavedTranslatedText("");
    setHistoryRecordId(null);
  }, []);

  const sourceLanguageOptions = useMemo(
    () => getSourceLanguageOptionsByKind(selectedFile?.kind),
    [selectedFile?.kind],
  );
  const sourceLanguageLabel = isAudio
    ? "Ngôn ngữ audio"
    : hasFile
      ? "Ngôn ngữ OCR"
      : "Ngôn ngữ nguồn";
  const detectedSourceLanguageLabel =
    sourceLanguage === AUTO_LANGUAGE && detectedSourceLanguage
      ? getLanguageLabel(detectedSourceLanguage)
      : null;

  const detectSourceLanguage = useCallback(
    async (text: string, isAudioFile: boolean) => {
      const normalizedText = text.trim();
      if (!normalizedText) return null;

      try {
        const result = await translateApi.detectLanguage({
          text: normalizedText,
        });
        const detectedLanguage = getDetectedLanguageCode(
          result.detected_languages,
        );

        return getSupportedSourceLanguage(detectedLanguage, isAudioFile);
      } catch {
        toast.warning("Không thể tự nhận diện ngôn ngữ nguồn.");
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedFile) return;

    const frameId = window.requestAnimationFrame(() => {
      translateOptionsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedFile]);

  const resetResult = useCallback(() => {
    setSourceText("");
    resetTranslatedResult();
    setDetectedSourceLanguage(null);
    setErrorMessage(null);
    updateTranslateProgress(0);
  }, [resetTranslatedResult, updateTranslateProgress]);

  const resetPage = useCallback(() => {
    translateRequestIdRef.current += 1;
    autoExtractedAudioFileRef.current = null;
    hasUserSelectedSourceLanguageRef.current = false;
    setSelectedFile(null);
    setSourceLanguage(AUTO_LANGUAGE);
    setTargetLanguage(DEFAULT_TARGET_LANGUAGE);
    setReturnTimestamp(false);
    setDenoiseAudio(false);
    setMode("translate");
    setProcessingStep("idle");
    setVisibleIsLoadingAudio(false);
    setIsSavingEditedTranslation(false);
    resetResult();
  }, [resetResult]);

  const extractText = useCallback(
    async (
      file = selectedFile,
      language = sourceLanguage,
      shouldReturnTimestamp = returnTimestamp,
      shouldDenoiseAudio = denoiseAudio,
    ) => {
      if (!file || processingStep !== "idle") return "";

      setProcessingStep("extracting");
      setErrorMessage(null);
      resetTranslatedResult();
      updateTranslateProgress(0);
      const requestId = translateRequestIdRef.current + 1;
      translateRequestIdRef.current = requestId;
      const isCurrentRequest = () =>
        requestId === translateRequestIdRef.current;
      const sourceIsAuto = language === AUTO_LANGUAGE;

      const loadingToastId = toast.loading(
        file.kind === "audio"
          ? "Đang nhận dạng audio bằng S2T..."
          : "Đang trích xuất văn bản bằng OCR...",
      );

      try {
        if (file.kind === "audio") {
          const job = await translateApi.createSpeechToTextJob({
            file: file.file,
            language: language === AUTO_LANGUAGE ? undefined : language,
            returnTimestamp: shouldReturnTimestamp,
            denoiseAudio: shouldDenoiseAudio,
          });

          if (!isCurrentRequest()) return "";

          let result = null;

          while (isCurrentRequest()) {
            const jobStatus = await translateApi.getSpeechToTextJob(job.job_id);

            if (!isCurrentRequest()) return "";

            if (jobStatus.status === "completed") {
              await animateProgressTo(
                translateProgressRef.current,
                100,
                updateTranslateProgress,
                isCurrentRequest,
              );
              result = jobStatus.result ?? null;
              break;
            }

            await animateProgressTo(
              translateProgressRef.current,
              jobStatus.progress,
              updateTranslateProgress,
              isCurrentRequest,
            );

            if (jobStatus.status === "failed") {
              throw new Error(jobStatus.error ?? "Không thể nhận dạng audio.");
            }

            await wait(TRANSLATE_JOB_POLL_INTERVAL_MS);
          }

          if (!isCurrentRequest() || !result) return "";

          const speechResult = result as SpeechToTextResponse;
          const text = getTranscriptText(speechResult.transcript);
          const detectedLanguage = sourceIsAuto
            ? getSupportedSourceLanguage(
                speechResult.language?.trim() ?? null,
                true,
              )
            : null;
          const resolvedDetectedLanguage =
            sourceIsAuto && !detectedLanguage
              ? await detectSourceLanguage(text, true)
              : detectedLanguage;
          if (!isCurrentRequest()) return "";
          setDetectedSourceLanguage(resolvedDetectedLanguage);
          setSourceText(text);
          toast.success("Đã nhận dạng audio.", {
            id: loadingToastId,
          });
          return text;
        }

        const job = await translateApi.createOcrJob({
          file: file.file,
          language: getOcrRequestLanguage(language),
        });

        if (!isCurrentRequest()) return "";

        let result = null;

        while (isCurrentRequest()) {
          const jobStatus = await translateApi.getOcrJob(job.job_id);

          if (!isCurrentRequest()) return "";

          if (jobStatus.status === "completed") {
            await animateProgressTo(
              translateProgressRef.current,
              100,
              updateTranslateProgress,
              isCurrentRequest,
            );
            result = jobStatus.result ?? null;
            break;
          }

          if (jobStatus.result) {
            const partialText = getOcrText(jobStatus.result.results);
            if (partialText) {
              setSourceText(partialText);
            }
          }

          await animateProgressTo(
            translateProgressRef.current,
            jobStatus.progress,
            updateTranslateProgress,
            isCurrentRequest,
          );

          if (jobStatus.status === "failed") {
            throw new Error(jobStatus.error ?? "Không thể trích xuất văn bản.");
          }

          await wait(TRANSLATE_JOB_POLL_INTERVAL_MS);
        }

        if (!isCurrentRequest() || !result) return "";

        const text = getOcrText(result.results);
        const detectedLanguage = sourceIsAuto
          ? await detectSourceLanguage(text, false)
          : null;
        if (!isCurrentRequest()) return "";
        setDetectedSourceLanguage(detectedLanguage);

        setSourceText(text);
        toast.success("Đã trích xuất văn bản.", {
          id: loadingToastId,
        });
        return text;
      } catch (error) {
        const message = formatError(error);
        setErrorMessage(message);
        toast.error(message, {
          id: loadingToastId,
        });
        return "";
      } finally {
        if (isCurrentRequest()) {
          setProcessingStep("idle");
        }
      }
    },
    [
      denoiseAudio,
      detectSourceLanguage,
      processingStep,
      resetTranslatedResult,
      returnTimestamp,
      selectedFile,
      sourceLanguage,
      updateTranslateProgress,
    ],
  );

  const translateText = useCallback(
    async (
      text = sourceText,
      translateMode = mode,
      translateTargetLanguage = targetLanguage,
    ) => {
      const normalizedText = text.trim();
      if (!normalizedText || processingStep !== "idle") return;

      const requestId = translateRequestIdRef.current + 1;
      translateRequestIdRef.current = requestId;
      setProcessingStep("translating");
      updateTranslateProgress(0);
      setErrorMessage(null);
      resetTranslatedResult();

      const isCurrentRequest = () =>
        requestId === translateRequestIdRef.current;
      const sourceLang =
        sourceLanguage === AUTO_LANGUAGE
          ? (detectedSourceLanguage ?? undefined)
          : sourceLanguage;

      try {
        const job =
          translateMode === "summarize"
            ? await translateApi.createTranslateSummarizeJob({
                sourceText: normalizedText,
                targetLang: translateTargetLanguage,
                sourceLang,
                sourceFileType: getSelectedFileType(selectedFile),
              })
            : await translateApi.createTranslateJob({
                sourceText: normalizedText,
                targetLang: translateTargetLanguage,
                sourceLang,
                sourceFileType: getSelectedFileType(selectedFile),
              });

        if (!isCurrentRequest()) return;

        while (isCurrentRequest()) {
          const jobStatus = await translateApi.getTranslateJob(job.job_id);

          if (!isCurrentRequest()) return;

          if (jobStatus.status === "completed") {
            await animateProgressTo(
              translateProgressRef.current,
              100,
              updateTranslateProgress,
              isCurrentRequest,
            );
            if (!isCurrentRequest()) return;
            const nextTranslatedText = jobStatus.result?.translated_text ?? "";

            setTranslatedText(nextTranslatedText);
            setSavedTranslatedText(nextTranslatedText);
            setHistoryRecordId(jobStatus.result?.history_record_id ?? null);
            break;
          }

          const partialTranslatedText = jobStatus.result?.translated_text ?? "";
          if (partialTranslatedText) {
            setTranslatedText(partialTranslatedText);
          }

          await animateProgressTo(
            translateProgressRef.current,
            jobStatus.progress,
            updateTranslateProgress,
            isCurrentRequest,
          );

          if (!isCurrentRequest()) return;

          if (jobStatus.status === "failed") {
            throw new Error("Không thể dịch nội dung.");
          }

          await wait(TRANSLATE_JOB_POLL_INTERVAL_MS);
        }

        if (!isCurrentRequest()) return;

        toast.success(
          translateMode === "summarize"
            ? "Đã dịch và tóm tắt nội dung."
            : "Đã dịch nội dung.",
        );
      } catch (error) {
        if (!isCurrentRequest()) return;
        const message = formatError(error);
        setErrorMessage(message);
        toast.error(message);
      } finally {
        if (isCurrentRequest()) {
          setProcessingStep("idle");
        }
      }
    },
    [
      detectedSourceLanguage,
      mode,
      processingStep,
      resetTranslatedResult,
      selectedFile,
      sourceLanguage,
      sourceText,
      targetLanguage,
      updateTranslateProgress,
    ],
  );

  const cancelTranslate = useCallback(() => {
    if (processingStep !== "translating") return;

    translateRequestIdRef.current += 1;
    setProcessingStep("idle");
    updateTranslateProgress(0);
    toast.info("Đã hủy tiến trình dịch.");
  }, [processingStep, updateTranslateProgress]);

  const saveEditedTranslation = useCallback(async () => {
    if (!historyRecordId || isSavingEditedTranslation || isBusy) return;

    const nextTranslatedText = translatedText.trim();
    const currentTranslatedText = savedTranslatedText.trim();

    if (!nextTranslatedText) {
      toast.error("Nội dung bản dịch không được để trống.");
      return;
    }

    if (nextTranslatedText === currentTranslatedText) {
      setTranslatedText(savedTranslatedText);
      return;
    }

    setIsSavingEditedTranslation(true);

    try {
      const updatedRecord = await translateApi.updateTranslationHistory(
        historyRecordId,
        {
          translatedText: nextTranslatedText,
        },
      );
      const nextDisplayText =
        updatedRecord.effective_translated_text ??
        updatedRecord.edited_translated_text ??
        updatedRecord.translated_text;

      setTranslatedText(nextDisplayText);
      setSavedTranslatedText(nextDisplayText);
      toast.success("Đã lưu bản dịch chỉnh sửa.");
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setIsSavingEditedTranslation(false);
    }
  }, [
    historyRecordId,
    isBusy,
    isSavingEditedTranslation,
    savedTranslatedText,
    translatedText,
  ]);

  const handleSelectedFileChange = useCallback(
    (nextFile: SelectedTranslateFile | null) => {
      autoExtractedAudioFileRef.current = null;
      const nextSourceLanguageOptions = getSourceLanguageOptionsByKind(
        nextFile?.kind,
      );
      const canKeepSourceLanguage = nextSourceLanguageOptions.some(
        (language) => language.value === sourceLanguage,
      );
      const nextSourceLanguage =
        hasUserSelectedSourceLanguageRef.current && canKeepSourceLanguage
          ? sourceLanguage
          : AUTO_LANGUAGE;

      if (nextSourceLanguage === AUTO_LANGUAGE) {
        hasUserSelectedSourceLanguageRef.current = false;
      }

      setSelectedFile(nextFile);
      setSourceLanguage(nextSourceLanguage);
      setDetectedSourceLanguage(null);
      setReturnTimestamp(false);
      setDenoiseAudio(false);
      setVisibleIsLoadingAudio(nextFile?.kind === "audio");
      resetResult();

      if (nextFile && nextFile.kind !== "audio") {
        void extractText(nextFile, nextSourceLanguage, false, false);
      }
    },
    [extractText, resetResult, sourceLanguage],
  );

  const handleSourceLanguageChange = useCallback(
    (value: string) => {
      hasUserSelectedSourceLanguageRef.current = value !== AUTO_LANGUAGE;
      setSourceLanguage(value);
      setDetectedSourceLanguage(null);

      if (!selectedFile) return;

      if (selectedFile.kind === "audio") {
        if (visibleIsLoadingAudio) return;

        void extractText(selectedFile, value, returnTimestamp, denoiseAudio);
        return;
      }

      void extractText(selectedFile, value, false, false);
    },
    [
      denoiseAudio,
      extractText,
      returnTimestamp,
      selectedFile,
      visibleIsLoadingAudio,
    ],
  );

  const handleReturnTimestampChange = useCallback(
    (value: string) => {
      const nextReturnTimestamp = value === "true";
      setReturnTimestamp(nextReturnTimestamp);

      if (selectedFile?.kind === "audio") {
        if (visibleIsLoadingAudio) return;

        void extractText(
          selectedFile,
          sourceLanguage,
          nextReturnTimestamp,
          denoiseAudio,
        );
      }
    },
    [
      denoiseAudio,
      extractText,
      selectedFile,
      sourceLanguage,
      visibleIsLoadingAudio,
    ],
  );

  const handleDenoiseAudioChange = useCallback(
    (value: string) => {
      const nextDenoiseAudio = value === "true";
      setDenoiseAudio(nextDenoiseAudio);

      if (selectedFile?.kind === "audio") {
        if (visibleIsLoadingAudio) return;

        void extractText(
          selectedFile,
          sourceLanguage,
          returnTimestamp,
          nextDenoiseAudio,
        );
      }
    },
    [
      extractText,
      returnTimestamp,
      selectedFile,
      sourceLanguage,
      visibleIsLoadingAudio,
    ],
  );

  const handleTargetLanguageChange = useCallback(
    (value: string) => {
      setTargetLanguage(value);
      resetTranslatedResult();
      updateTranslateProgress(0);
    },
    [resetTranslatedResult, updateTranslateProgress],
  );

  useEffect(() => {
    if (
      !selectedFile ||
      selectedFile.kind !== "audio" ||
      visibleIsLoadingAudio ||
      processingStep !== "idle" ||
      autoExtractedAudioFileRef.current === selectedFile.file
    ) {
      return;
    }

    autoExtractedAudioFileRef.current = selectedFile.file;
    void extractText(
      selectedFile,
      sourceLanguage,
      returnTimestamp,
      denoiseAudio,
    );
  }, [
    denoiseAudio,
    extractText,
    processingStep,
    returnTimestamp,
    selectedFile,
    sourceLanguage,
    visibleIsLoadingAudio,
  ]);

  const handleModeChange = useCallback(
    (value: string) => {
      const nextMode = value as TranslateMode;

      setMode(nextMode);

      if (!sourceText.trim() || isBusy) return;

      void translateText(sourceText, nextMode, targetLanguage);
    },
    [isBusy, sourceText, targetLanguage, translateText],
  );

  const handleSourceTextChange = useCallback(
    (value: string) => {
      setSourceText(value);
      resetTranslatedResult();
      setDetectedSourceLanguage(null);
      updateTranslateProgress(0);
    },
    [resetTranslatedResult, updateTranslateProgress],
  );

  const clearSourceText = useCallback(() => {
    setSourceText("");
    resetTranslatedResult();
    updateTranslateProgress(0);
  }, [resetTranslatedResult, updateTranslateProgress]);

  const copyText = useCallback(async (text: string, successMessage: string) => {
    if (!text.trim()) return false;

    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
      return true;
    } catch {
      toast.error("Không thể sao chép nội dung.");
      return false;
    }
  }, []);

  return {
    clearSourceText,
    copyText,
    denoiseAudio,
    detectedSourceLanguageLabel,
    downloadTranslatedFile,
    errorMessage,
    extractText,
    exportingFormat,
    handleDenoiseAudioChange,
    handleModeChange,
    handleReturnTimestampChange,
    handleSelectedFileChange,
    handleSourceLanguageChange,
    handleSourceTextChange,
    handleTargetLanguageChange,
    hasFile,
    hasPendingTranslationEdit,
    hasSourceText,
    hasTranslatedText,
    isAudio,
    isBusy,
    isSavingEditedTranslation,
    mode,
    outputTitle,
    processingStep,
    resetPage,
    returnTimestamp,
    saveEditedTranslation,
    selectedFile,
    setErrorMessage,
    setTranslatedText,
    setVisibleIsLoadingAudio,
    sourceAutoScroll,
    sourceLanguage,
    sourceLanguageLabel,
    sourceLanguageOptions,
    sourceText,
    targetLanguage,
    translateOptionsRef,
    translateProgress,
    translateText,
    translatedAutoScroll,
    translatedText,
    visibleIsLoadingAudio,
    cancelTranslate,
    canSaveTranslationEdit,
  };
}
