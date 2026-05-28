import {
  Check,
  Languages,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { translateApi } from "@/feature/translate/api/translate.api";
import { CopyFeedbackButton } from "@/feature/translate/components/copy-feedback-button";
import { TranslateDownloadDropdown } from "@/feature/translate/components/translate-download-dropdown";
import {
  AUTO_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  LIVE_TRANSLATE_SOURCE_LANGUAGE_OPTIONS,
  TRANSLATION_LANGUAGES,
} from "@/feature/translate/constants/translate.constants";
import { useDownloadTranslatedFile } from "@/feature/translate/hooks/use-download-translated-file";
import type { TranslateMode } from "@/feature/translate/types/translate.types";
import { useAuthStore } from "@/store/auth.store";
import {
  animateProgressTo,
  AUTO_DETECT_ERROR_MESSAGE,
  formatError,
  getDetectedLanguageCode,
  TRANSLATE_JOB_POLL_INTERVAL_MS,
  wait,
} from "@/utils";

const EDIT_TRANSLATION_PERMISSION = "translate.history.update";

function normalizeLiveDetectedLanguage(language: string) {
  const normalizedLanguage = language.trim();
  const lowerLanguage = normalizedLanguage.toLowerCase();

  if (["zh-cn", "zh-hans", "cmn"].includes(lowerLanguage)) {
    return "zh";
  }

  if (["zh-tw", "zh-hk", "zh-hant"].includes(lowerLanguage)) {
    return "zh-Hant";
  }

  return (
    LIVE_TRANSLATE_SOURCE_LANGUAGE_OPTIONS.find(
      (option) => option.value.toLowerCase() === lowerLanguage,
    )?.value ?? null
  );
}

export default function TranslateLive() {
  const currentUser = useAuthStore((state) => state.user);
  const translateRequestIdRef = useRef(0);
  const translateProgressRef = useRef(0);
  const sourceLanguageRef = useRef(AUTO_LANGUAGE);
  const [sourceLanguage, setSourceLanguage] = useState(AUTO_LANGUAGE);
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_TARGET_LANGUAGE);
  const [mode, setMode] = useState<TranslateMode>("translate");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [savedTranslatedText, setSavedTranslatedText] = useState("");
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSavingEditedTranslation, setIsSavingEditedTranslation] =
    useState(false);
  const [translateProgress, setTranslateProgress] = useState(0);

  const hasSourceText = sourceText.trim().length > 0;
  const hasTranslatedText = translatedText.trim().length > 0;
  const outputTitle = mode === "summarize" ? "Bản dịch tóm tắt" : "Bản dịch";
  const exportFilename =
    mode === "summarize" ? "ban-dich-tom-tat-truc-tiep" : "ban-dich-truc-tiep";
  const canUpdateTranslationHistory =
    currentUser?.permissions.includes(EDIT_TRANSLATION_PERMISSION) ?? false;
  const canSaveTranslationEdit =
    canUpdateTranslationHistory && Boolean(historyRecordId);
  const hasPendingTranslationEdit =
    canSaveTranslationEdit && translatedText !== savedTranslatedText;
  const { downloadTranslatedFile, exportingFormat } = useDownloadTranslatedFile(
    {
      filename: exportFilename,
      text: translatedText,
      title: outputTitle,
    },
  );

  const updateTranslateProgress = useCallback((progress: number) => {
    translateProgressRef.current = progress;
    setTranslateProgress(progress);
  }, []);

  const updateSourceLanguage = useCallback((language: string) => {
    sourceLanguageRef.current = language;
    setSourceLanguage(language);
  }, []);

  const resetTranslatedResult = useCallback(() => {
    setTranslatedText("");
    setSavedTranslatedText("");
    setHistoryRecordId(null);
  }, []);

  const resetPage = () => {
    translateRequestIdRef.current += 1;
    updateSourceLanguage(AUTO_LANGUAGE);
    setTargetLanguage(DEFAULT_TARGET_LANGUAGE);
    setMode("translate");
    setSourceText("");
    resetTranslatedResult();
    setIsTranslating(false);
    setIsSavingEditedTranslation(false);
    updateTranslateProgress(0);
  };

  const handleTargetLanguageChange = (value: string) => {
    setTargetLanguage(value);
    resetTranslatedResult();
    updateTranslateProgress(0);
  };

  const handleModeChange = (value: string) => {
    setMode(value as TranslateMode);
    resetTranslatedResult();
    updateTranslateProgress(0);
  };

  const runTranslate = useCallback(
    async ({
      text,
      translateMode,
      translateTargetLanguage,
      showToast = false,
    }: {
      text: string;
      translateMode: TranslateMode;
      translateTargetLanguage: string;
      showToast?: boolean;
    }) => {
      const normalizedText = text.trim();
      if (!normalizedText) return;

      const requestId = translateRequestIdRef.current + 1;
      translateRequestIdRef.current = requestId;
      setIsTranslating(true);
      updateTranslateProgress(0);
      resetTranslatedResult();

      try {
        if (sourceLanguageRef.current === AUTO_LANGUAGE) {
          await animateProgressTo(
            translateProgressRef.current,
            3,
            updateTranslateProgress,
            () => requestId === translateRequestIdRef.current,
          );

          const detectedResult = await translateApi.detectLanguage({
            text: normalizedText,
          });

          if (requestId !== translateRequestIdRef.current) return;

          const nextDetectedLanguage = getDetectedLanguageCode(
            detectedResult.detected_languages,
          );

          if (!nextDetectedLanguage) {
            throw new Error(AUTO_DETECT_ERROR_MESSAGE);
          }

          const normalizedDetectedLanguage =
            normalizeLiveDetectedLanguage(nextDetectedLanguage);

          if (normalizedDetectedLanguage) {
            updateSourceLanguage(normalizedDetectedLanguage);
          }
        }

        await animateProgressTo(
          translateProgressRef.current,
          5,
          updateTranslateProgress,
          () => requestId === translateRequestIdRef.current,
        );

        const job =
          translateMode === "summarize"
            ? await translateApi.createTranslateSummarizeJob({
                sourceText: normalizedText,
                targetLang: translateTargetLanguage,
                sourceLang:
                  sourceLanguageRef.current === AUTO_LANGUAGE
                    ? undefined
                    : sourceLanguageRef.current,
              })
            : await translateApi.createTranslateJob({
                sourceText: normalizedText,
                targetLang: translateTargetLanguage,
                sourceLang:
                  sourceLanguageRef.current === AUTO_LANGUAGE
                    ? undefined
                    : sourceLanguageRef.current,
              });

        if (requestId !== translateRequestIdRef.current) return;

        while (requestId === translateRequestIdRef.current) {
          const jobStatus = await translateApi.getTranslateJob(job.job_id);

          if (requestId !== translateRequestIdRef.current) return;

          if (jobStatus.status === "completed") {
            await animateProgressTo(
              translateProgressRef.current,
              100,
              updateTranslateProgress,
              () => requestId === translateRequestIdRef.current,
            );
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
            () => requestId === translateRequestIdRef.current,
          );

          if (jobStatus.status === "failed") {
            throw new Error(jobStatus.error ?? "Không thể dịch nội dung.");
          }

          await wait(TRANSLATE_JOB_POLL_INTERVAL_MS);
        }

        if (showToast) {
          toast.success(
            translateMode === "summarize"
              ? "Đã dịch và tóm tắt nội dung."
              : "Đã dịch nội dung.",
          );
        }
      } catch (error) {
        if (requestId === translateRequestIdRef.current) {
          toast.error(formatError(error));
        }
      } finally {
        if (requestId === translateRequestIdRef.current) {
          setIsTranslating(false);
        }
      }
    },
    [resetTranslatedResult, updateSourceLanguage, updateTranslateProgress],
  );

  useEffect(() => {
    const normalizedText = sourceText.trim();

    if (!normalizedText) {
      translateRequestIdRef.current += 1;
      resetTranslatedResult();
      setIsTranslating(false);
      updateTranslateProgress(0);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runTranslate({
        text: normalizedText,
        translateMode: mode,
        translateTargetLanguage: targetLanguage,
      });
    }, 800);

    return () => {
      window.clearTimeout(timeoutId);
      translateRequestIdRef.current += 1;
    };
  }, [
    mode,
    resetTranslatedResult,
    runTranslate,
    sourceText,
    targetLanguage,
    updateTranslateProgress,
  ]);

  const translateText = async () => {
    await runTranslate({
      text: sourceText,
      translateMode: mode,
      translateTargetLanguage: targetLanguage,
      showToast: true,
    });
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

  const cancelTranslate = () => {
    if (!isTranslating) return;

    translateRequestIdRef.current += 1;
    setIsTranslating(false);
    updateTranslateProgress(0);
    toast.info("Đã hủy tiến trình dịch.");
  };

  const saveEditedTranslation = async () => {
    if (!historyRecordId || isSavingEditedTranslation) return;

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

  return (
    <PageLayout
      title="Dịch trực tiếp"
      description="Nhập văn bản nguồn để dịch hoặc tóm tắt nội dung."
      titleClassName="translation-page-title"
      className="h-[calc(100vh-var(--app-header-height)-3rem)] overflow-y-hidden"
      onRefresh={resetPage}
    >
      <Card className="translation-surface shrink-0 gap-0 py-5">
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="translate-live-source-language">
                Ngôn ngữ nguồn
              </Label>
              <Combobox
                id="translate-live-source-language"
                value={sourceLanguage}
                onValueChange={updateSourceLanguage}
                options={LIVE_TRANSLATE_SOURCE_LANGUAGE_OPTIONS}
                disabled={isTranslating}
                searchPlaceholder="Tìm ngôn ngữ nguồn..."
                emptyMessage="Không tìm thấy ngôn ngữ nguồn"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="translate-live-target-language">Dịch sang</Label>
              <Combobox
                id="translate-live-target-language"
                value={targetLanguage}
                onValueChange={handleTargetLanguageChange}
                options={TRANSLATION_LANGUAGES}
                disabled={isTranslating}
                searchPlaceholder="Tìm ngôn ngữ dịch..."
                emptyMessage="Không tìm thấy ngôn ngữ dịch"
              />
            </div>
          </div>

          <Tabs value={mode} onValueChange={handleModeChange}>
            <TabsList>
              <TabsTrigger value="translate" disabled={isTranslating}>
                <Languages className="size-4" />
                Dịch
              </TabsTrigger>
              <TabsTrigger value="summarize" disabled={isTranslating}>
                <Sparkles className="size-4" />
                Tóm tắt
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <Card className="translation-surface flex min-h-0 flex-col">
          <CardHeader className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 ">
              Văn bản nguồn
              <div className="shrink-0 border-l border-l-gray-200 pl-2 text-right text-sm text-muted-foreground">
                {sourceText.length} ký tự
              </div>
            </CardTitle>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={!hasSourceText || isTranslating}
                onClick={() => {
                  translateRequestIdRef.current += 1;
                  updateSourceLanguage(AUTO_LANGUAGE);
                  setSourceText("");
                  resetTranslatedResult();
                  setIsTranslating(false);
                  updateTranslateProgress(0);
                }}
              >
                <RotateCcw className="mr-2 size-4" />
                Xóa
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="relative min-h-0 flex-1">
              <Textarea
                value={sourceText}
                onChange={(event) => {
                  updateSourceLanguage(AUTO_LANGUAGE);
                  setSourceText(event.target.value);
                  resetTranslatedResult();
                  updateTranslateProgress(0);
                }}
                placeholder="Nhập văn bản cần dịch tại đây."
                className="multilingual-content h-full min-h-0 resize-none p-4 pb-14 text-sm leading-6"
              />
              <CopyFeedbackButton
                className="absolute right-4 bottom-4"
                disabled={!hasSourceText}
                label="Sao chép văn bản nguồn"
                onCopy={() =>
                  copyText(sourceText, "Đã sao chép văn bản nguồn.")
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              {isTranslating ? (
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
                disabled={!hasSourceText || isTranslating}
                onClick={() => void translateText()}
              >
                {isTranslating ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <Languages className="mr-2 size-4" />
                )}
                {isTranslating
                  ? `Đang dịch... ${translateProgress}%`
                  : "Dịch văn bản"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="translation-surface flex min-h-0 flex-col">
          <CardHeader className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                  isTranslating ||
                  Boolean(exportingFormat) ||
                  hasPendingTranslationEdit ||
                  isSavingEditedTranslation
                }
                exportingFormat={exportingFormat}
                onDownload={downloadTranslatedFile}
              />
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            {isTranslating && !translatedText ? (
              <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                <LoaderCircle className="size-8 animate-spin text-primary-500" />
                <div className="flex w-full max-w-xs flex-col items-center gap-2">
                  <span>
                    {mode === "summarize"
                      ? "Đang tóm tắt nội dung ..."
                      : "Đang dịch nội dung..."}
                  </span>
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
              <div className="relative h-full min-h-0">
                <Textarea
                  value={translatedText}
                  readOnly={
                    !canSaveTranslationEdit || isSavingEditedTranslation
                  }
                  onChange={(event) => setTranslatedText(event.target.value)}
                  className="multilingual-content h-full min-h-0 resize-none overflow-auto rounded-md border bg-muted/30 p-4 pb-14 text-sm leading-6"
                />
                <CopyFeedbackButton
                  className="absolute right-4 bottom-4"
                  disabled={
                    !hasTranslatedText ||
                    isTranslating ||
                    hasPendingTranslationEdit ||
                    isSavingEditedTranslation
                  }
                  label="Sao chép bản dịch"
                  onCopy={() =>
                    copyText(translatedText, "Đã sao chép bản dịch.")
                  }
                />
                {isTranslating ? (
                  <div className="translation-progress-chip">
                    <LoaderCircle className="size-3.5 animate-spin text-primary-500" />
                    <span>Đang dịch tiếp... {translateProgress}%</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="relative flex h-full min-h-0 items-center justify-center rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
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
    </PageLayout>
  );
}
