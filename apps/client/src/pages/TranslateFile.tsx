import {
  Check,
  FileText,
  Languages,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PageLayout } from "@/components/PageLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { CopyFeedbackButton } from "@/feature/translate/components/copy-feedback-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { translateApi } from "@/feature/translate/api/translate.api";
import { TranslateAudioPreview } from "@/feature/translate/components/translate-audio-preview";
import { TranslateDownloadDropdown } from "@/feature/translate/components/translate-download-dropdown";
import { TranslateFileDropzone } from "@/feature/translate/components/translate-file-dropzone";
import {
  AUTO_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  OCR_LANGUAGES,
  SPEECH_LANGUAGES,
  TRANSLATION_LANGUAGES,
} from "@/feature/translate/constants/translate.constants";
import { useDownloadTranslatedFile } from "@/feature/translate/hooks/use-download-translated-file";
import type {
  SelectedTranslateFile,
  SpeechToTextResponse,
  TranslateMode,
} from "@/feature/translate/types/translate.types";
import {
  getLanguageLabel,
  getOcrText,
  getTranscriptText,
} from "@/feature/translate/utils/translate-file.utils";
import { useAuthStore } from "@/store/auth.store";
import {
  animateProgressTo,
  formatError,
  TRANSLATE_JOB_POLL_INTERVAL_MS,
  wait,
  type ProcessingStep,
} from "@/utils";

const EDIT_TRANSLATION_PERMISSION = "translate.history.update";

function getDetectedLanguageCode(
  detectedLanguages?: string | string[],
): string | null {
  const rawLanguage = Array.isArray(detectedLanguages)
    ? detectedLanguages[0]
    : detectedLanguages;
  const normalizedLanguage = rawLanguage?.trim();

  return normalizedLanguage || null;
}

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

export default function TranslateFile() {
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
    ? "Ng\u00f4n ng\u1eef audio"
    : hasFile
      ? "Ng\u00f4n ng\u1eef OCR"
      : "Ng\u00f4n ng\u1eef ngu\u1ed3n";

  const detectSourceLanguage = async (
    text: string,
    sourceIsAudio = isAudio,
  ) => {
    const normalizedText = text.trim();
    if (!normalizedText) return null;

    try {
      const result = await translateApi.detectLanguage({
        text: normalizedText,
      });
      const detectedLanguage = getDetectedLanguageCode(
        result.detected_languages,
      );
      const supportedLanguage = getSupportedSourceLanguage(
        detectedLanguage,
        sourceIsAudio,
      );

      return supportedLanguage;
    } catch {
      toast.warning("Không thể tự nhận diện ngôn ngữ nguồn.");
      return null;
    }
  };

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

  const resetResult = () => {
    setSourceText("");
    resetTranslatedResult();
    setDetectedSourceLanguage(null);
    setErrorMessage(null);
    updateTranslateProgress(0);
  };

  const resetPage = () => {
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
  };

  const extractText = async (
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
    const isCurrentRequest = () => requestId === translateRequestIdRef.current;
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
  };

  const translateText = async (
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

    const isCurrentRequest = () => requestId === translateRequestIdRef.current;
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
          throw new Error(jobStatus.error ?? "Không thể dịch nội dung.");
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
  };

  const cancelTranslate = () => {
    if (processingStep !== "translating") return;

    translateRequestIdRef.current += 1;
    setProcessingStep("idle");
    updateTranslateProgress(0);
    toast.info("Đã hủy tiến trình dịch.");
  };

  const saveEditedTranslation = async () => {
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
  };

  const handleSelectedFileChange = (nextFile: SelectedTranslateFile | null) => {
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
  };

  const handleSourceLanguageChange = (value: string) => {
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
  };

  const handleReturnTimestampChange = (value: string) => {
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
  };

  const handleDenoiseAudioChange = (value: string) => {
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
  };

  const handleTargetLanguageChange = (value: string) => {
    setTargetLanguage(value);
    resetTranslatedResult();
    updateTranslateProgress(0);
  };

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
    selectedFile,
    visibleIsLoadingAudio,
    processingStep,
    sourceLanguage,
    returnTimestamp,
    denoiseAudio,
  ]);

  const handleModeChange = (value: string) => {
    const nextMode = value as TranslateMode;

    setMode(nextMode);

    if (!sourceText.trim() || isBusy) return;

    void translateText(sourceText, nextMode, targetLanguage);
  };

  const copyText = async (text: string, successMessage: string) => {
    if (!text.trim()) return false;

    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
      return true;
    } catch {
      toast.error("Không thể sao chép nội dung.");
      return false;
    }
  };

  const renderTranslateOptions = () => (
    <Card className="translation-surface py-5">
      <CardContent
        className={`flex flex-col gap-4 ${
          isAudio
            ? "xl:flex-row xl:items-end xl:justify-between"
            : "lg:flex-row lg:items-end lg:justify-between"
        }`}
      >
        <div
          className={`grid flex-1 gap-3 sm:grid-cols-2 ${
            isAudio ? "xl:max-w-6xl xl:grid-cols-4" : "lg:max-w-2xl"
          }`}
        >
          <div className="space-y-2">
            <Label htmlFor="translate-source-language">
              {sourceLanguageLabel}
            </Label>
            <Combobox
              id="translate-source-language"
              value={sourceLanguage}
              onValueChange={handleSourceLanguageChange}
              options={sourceLanguageOptions}
              disabled={isBusy}
              searchPlaceholder="Tìm ngôn ngữ nguồn..."
              emptyMessage="Không tìm thấy ngôn ngữ nguồn"
            />
            {sourceLanguage === AUTO_LANGUAGE && detectedSourceLanguage ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">
                  {`Nhận diện: ${getLanguageLabel(detectedSourceLanguage)}`}
                </Badge>
              </div>
            ) : null}
          </div>

          {isAudio ? (
            <div className="space-y-2">
              <Label htmlFor="translate-return-timestamp">Timestamp</Label>
              <Select
                value={String(returnTimestamp)}
                onValueChange={handleReturnTimestampChange}
                disabled={isBusy}
              >
                <SelectTrigger
                  id="translate-return-timestamp"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">{"Không trả timestamp"}</SelectItem>
                  <SelectItem value="true">{"Trả timestamp"}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {
                  "Timestamp chỉ trả về khi S2T ngôn ngữ nước ngoài, hiện chưa hỗ trợ tiếng Việt.."
                }
              </p>
            </div>
          ) : null}

          {isAudio ? (
            <div className="space-y-2">
              <Label htmlFor="translate-denoise-audio">
                {"Kh\u1eed nhi\u1ec5u"}
              </Label>
              <Select
                value={String(denoiseAudio)}
                onValueChange={handleDenoiseAudioChange}
                disabled={isBusy}
              >
                <SelectTrigger id="translate-denoise-audio" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">
                    {"Kh\u00f4ng kh\u1eed nhi\u1ec5u"}
                  </SelectItem>
                  <SelectItem value="true">{"Kh\u1eed nhi\u1ec5u"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="translate-target-language">
              {"D\u1ecbch sang"}
            </Label>
            <Combobox
              id="translate-target-language"
              value={targetLanguage}
              onValueChange={handleTargetLanguageChange}
              options={TRANSLATION_LANGUAGES}
              disabled={isBusy}
              searchPlaceholder="Tìm ngôn ngữ dịch..."
              emptyMessage="Không tìm thấy ngôn ngữ dịch"
            />
          </div>
        </div>

        <div
          className={`flex shrink-0 flex-wrap items-center gap-3 ${
            isAudio ? "xl:justify-end" : "lg:justify-end"
          }`}
        >
          <Tabs value={mode} onValueChange={handleModeChange}>
            <TabsList>
              <TabsTrigger value="translate" disabled={isBusy}>
                <Languages className="size-4" />
                {"D\u1ecbch"}
              </TabsTrigger>
              <TabsTrigger value="summarize" disabled={isBusy}>
                <Sparkles className="size-4" />
                {"T\u00f3m t\u1eaft"}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {!isAudio ? (
            <Button
              type="button"
              variant="outline"
              className="shadow-lg shadow-slate-200/80 transition-shadow hover:shadow-xl hover:shadow-slate-300/80"
              disabled={!selectedFile || isBusy}
              onClick={() => void extractText()}
            >
              {processingStep === "extracting" ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <FileText className="mr-2 size-4" />
              )}
              {processingStep === "extracting"
                ? "\u0110ang tr\u00edch xu\u1ea5t..."
                : "Tr\u00edch xu\u1ea5t v\u0103n b\u1ea3n"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <PageLayout
      title="Dịch tệp tin"
      description="Tải audio, PDF, DOCX, TXT hoặc ảnh để trích xuất và dịch nội dung."
      titleClassName="translation-page-title"
      onRefresh={resetPage}
    >
      {!hasFile ? renderTranslateOptions() : null}

      <Card className="translation-surface">
        <CardHeader>
          <CardTitle>Dịch từ tệp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label>File</Label>
            <TranslateFileDropzone
              value={selectedFile}
              disabled={isBusy}
              onChange={handleSelectedFileChange}
              onValidationError={setErrorMessage}
            />
          </div>
        </CardContent>
      </Card>

      {isAudio ? (
        <TranslateAudioPreview
          file={selectedFile?.file ?? null}
          onLoadingChange={setVisibleIsLoadingAudio}
        />
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Không thể xử lý yêu cầu</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {hasFile ? (
        <>
          <div ref={translateOptionsRef}>{renderTranslateOptions()}</div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="translation-surface">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2">
                  Văn bản nguồn
                  <div className="shrink-0 text-right text-sm text-muted-foreground border-l border-l-gray-200 pl-2">
                    {sourceText.length} ký tự
                  </div>
                </CardTitle>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!hasSourceText || isBusy}
                    onClick={() => {
                      setSourceText("");
                      resetTranslatedResult();
                      updateTranslateProgress(0);
                    }}
                  >
                    <RotateCcw className="mr-2 size-4" />
                    Xóa
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="relative">
                  <Textarea
                    value={sourceText}
                    onChange={(event) => {
                      setSourceText(event.target.value);
                      resetTranslatedResult();
                      setDetectedSourceLanguage(null);
                      updateTranslateProgress(0);
                    }}
                    disabled={isBusy}
                    placeholder="Nội dung trích xuất sẽ hiển thị tại đây."
                    className="translation-textarea"
                  />
                  <CopyFeedbackButton
                    className="absolute right-4 bottom-4"
                    disabled={!hasSourceText || isBusy}
                    label="Sao chép văn bản nguồn"
                    onCopy={() =>
                      copyText(sourceText, "Đã sao chép văn bản nguồn.")
                    }
                  />
                  {visibleIsLoadingAudio || processingStep === "extracting" ? (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md bg-gray-50 p-6 text-center text-sm text-muted-foreground">
                      <LoaderCircle className="size-8 animate-spin text-primary-500" />
                      <span>
                        {visibleIsLoadingAudio
                          ? "Đang tải audio..."
                          : isAudio
                            ? "Đang nhận dạng audio..."
                            : "Đang trích xuất văn bản..."}
                      </span>
                      {processingStep === "extracting" ? (
                        <div className="flex w-full max-w-xs flex-col items-center gap-2">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary-500 transition-all duration-500 ease-out"
                              style={{ width: `${translateProgress}%` }}
                            />
                          </div>
                          <span className="text-lg font-semibold text-primary-600">
                            {translateProgress}%
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2">
                  {processingStep === "translating" ? (
                    <Button
                      className="w-fit"
                      type="button"
                      variant="outline"
                      onClick={cancelTranslate}
                    >
                      <XCircle className="mr-2 size-4" />
                      Hủy dịch
                    </Button>
                  ) : null}
                  <Button
                    className="w-fit"
                    type="button"
                    disabled={!hasSourceText || isBusy}
                    onClick={() => void translateText()}
                  >
                    {processingStep === "translating" ? (
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Languages className="mr-2 size-4" />
                    )}
                    {processingStep === "translating"
                      ? `Đang dịch... ${translateProgress}%`
                      : "Dịch văn bản"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="translation-surface">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>{outputTitle}</CardTitle>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {hasPendingTranslationEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isSavingEditedTranslation}
                      onClick={() => void saveEditedTranslation()}
                    >
                      {isSavingEditedTranslation ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Lưu
                    </Button>
                  ) : null}

                  <TranslateDownloadDropdown
                    disabled={
                      !hasTranslatedText ||
                      isBusy ||
                      Boolean(exportingFormat) ||
                      hasPendingTranslationEdit ||
                      isSavingEditedTranslation
                    }
                    exportingFormat={exportingFormat}
                    onDownload={downloadTranslatedFile}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {processingStep === "translating" && !translatedText ? (
                  <div className="translation-empty-state flex-col gap-3">
                    <LoaderCircle className="size-8 animate-spin text-primary-500" />
                    <div className="flex w-full max-w-xs flex-col items-center gap-2">
                      <span>Đang dịch nội dung...</span>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary-500 transition-all duration-500 ease-out"
                          style={{ width: `${translateProgress}%` }}
                        />
                      </div>
                      <span className="font-medium text-primary-600">
                        {translateProgress}%
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelTranslate}
                    >
                      <XCircle className="mr-1 size-4" />
                      Hủy dịch
                    </Button>
                  </div>
                ) : translatedText ? (
                  <div className="relative">
                    <Textarea
                      value={translatedText}
                      readOnly={
                        !canSaveTranslationEdit ||
                        isBusy ||
                        isSavingEditedTranslation
                      }
                      onChange={(event) =>
                        setTranslatedText(event.target.value)
                      }
                      className="translation-textarea rounded-md border bg-muted/30"
                    />
                    <CopyFeedbackButton
                      className="absolute right-4 bottom-4"
                      disabled={
                        !hasTranslatedText ||
                        isBusy ||
                        hasPendingTranslationEdit ||
                        isSavingEditedTranslation
                      }
                      label="Sao chép bản dịch"
                      onCopy={() =>
                        copyText(translatedText, "Đã sao chép bản dịch.")
                      }
                    />
                    {processingStep === "translating" ? (
                      <div className="translation-progress-chip">
                        <LoaderCircle className="size-3.5 animate-spin text-primary-500" />
                        <span>Đang dịch tiếp... {translateProgress}%</span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="translation-empty-state relative">
                    Bản dịch sẽ hiển thị ở đây.
                    <CopyFeedbackButton
                      className="absolute right-4 bottom-4"
                      disabled
                      label="Sao chép bản dịch"
                      onCopy={() =>
                        copyText(translatedText, "Đã sao chép bản dịch.")
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </PageLayout>
  );
}
