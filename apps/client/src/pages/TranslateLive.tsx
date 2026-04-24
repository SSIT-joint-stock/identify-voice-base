import {
  Copy,
  Languages,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import {
  AUTO_LANGUAGE,
  LIVE_TRANSLATE_SOURCE_LANGUAGE_OPTIONS,
  TRANSLATION_LANGUAGES,
} from "@/feature/translate/constants/translate.constants";
import type { TranslateMode } from "@/feature/translate/types/translate.types";
import {
  animateProgressTo,
  AUTO_DETECT_ERROR_MESSAGE,
  formatError,
  getDetectedLanguageCode,
  TRANSLATE_JOB_POLL_INTERVAL_MS,
  wait,
} from "@/utils";

export default function TranslateLive() {
  const translateRequestIdRef = useRef(0);
  const translateProgressRef = useRef(0);
  const [sourceLanguage, setSourceLanguage] = useState(AUTO_LANGUAGE);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [mode, setMode] = useState<TranslateMode>("translate");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState(0);

  const hasSourceText = sourceText.trim().length > 0;
  const outputTitle = mode === "summarize" ? "Bản dịch tóm tắt" : "Bản dịch";

  const updateTranslateProgress = useCallback((progress: number) => {
    translateProgressRef.current = progress;
    setTranslateProgress(progress);
  }, []);

  const resetPage = () => {
    translateRequestIdRef.current += 1;
    setSourceLanguage(AUTO_LANGUAGE);
    setTargetLanguage("en");
    setMode("translate");
    setSourceText("");
    setTranslatedText("");
    setIsTranslating(false);
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
      setTranslatedText("");

      try {
        if (sourceLanguage === AUTO_LANGUAGE) {
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
              })
            : await translateApi.createTranslateJob({
                sourceText: normalizedText,
                targetLang: translateTargetLanguage,
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
            setTranslatedText(jobStatus.result?.translated_text ?? "");
            break;
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
    [sourceLanguage, updateTranslateProgress],
  );

  useEffect(() => {
    const normalizedText = sourceText.trim();

    if (!normalizedText) {
      translateRequestIdRef.current += 1;
      setTranslatedText("");
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
  }, [mode, runTranslate, sourceText, targetLanguage, updateTranslateProgress]);

  const translateText = async () => {
    await runTranslate({
      text: sourceText,
      translateMode: mode,
      translateTargetLanguage: targetLanguage,
      showToast: true,
    });
  };

  const copyText = async (text: string, successMessage: string) => {
    if (!text.trim()) return;

    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error("Không thể sao chép nội dung.");
    }
  };

  return (
    <PageLayout
      title="Dịch trực tiếp"
      description="Nhập văn bản nguồn để dịch hoặc tóm tắt nội dung."
      titleClassName="font-playfair text-[34px] leading-[1.1] font-bold tracking-tight text-[#4b1d18] md:text-[42px]"
      className="h-[calc(100vh-var(--app-header-height)-3rem)] overflow-y-hidden"
      onRefresh={resetPage}
    >
      <Card className="shrink-0 gap-0 rounded-md py-5">
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="translate-live-source-language">
                Ngôn ngữ nguồn
              </Label>
              <Select
                value={sourceLanguage}
                onValueChange={setSourceLanguage}
                disabled={isTranslating}
              >
                <SelectTrigger
                  id="translate-live-source-language"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIVE_TRANSLATE_SOURCE_LANGUAGE_OPTIONS.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="translate-live-target-language">Dịch sang</Label>
              <Select
                value={targetLanguage}
                onValueChange={setTargetLanguage}
                disabled={isTranslating}
              >
                <SelectTrigger
                  id="translate-live-target-language"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSLATION_LANGUAGES.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as TranslateMode)}
          >
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
        <Card className="flex min-h-0 flex-col rounded-md">
          <CardHeader className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 ">
              Văn bản nguồn
              <div className="shrink-0 text-right text-sm text-muted-foreground border-l border-l-gray-200 pl-2">
                {sourceText.length} ký tự
              </div>
            </CardTitle>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={!hasSourceText}
                onClick={() =>
                  void copyText(sourceText, "Đã sao chép văn bản nguồn.")
                }
              >
                <Copy className="mr-2 size-4" />
                Sao chép
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={!hasSourceText || isTranslating}
                onClick={() => {
                  translateRequestIdRef.current += 1;
                  setSourceText("");
                  setTranslatedText("");
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
            <Textarea
              value={sourceText}
              onChange={(event) => {
                setSourceText(event.target.value);
                setTranslatedText("");
                updateTranslateProgress(0);
              }}
              placeholder="Nhập văn bản cần dịch tại đây."
              className="min-h-0 flex-1 resize-none p-4 text-sm leading-6"
            />
            <div className="flex justify-end">
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

        <Card className="flex min-h-0 flex-col rounded-md">
          <CardHeader className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{outputTitle}</CardTitle>

            <Button
              type="button"
              variant="outline"
              disabled={!translatedText.trim()}
              onClick={() =>
                void copyText(translatedText, "Đã sao chép bản dịch.")
              }
            >
              <Copy className="mr-2 size-4" />
              Sao chép kết quả
            </Button>
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            {isTranslating ? (
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
              </div>
            ) : translatedText ? (
              <div className="h-full min-h-0 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-6">
                {translatedText}
              </div>
            ) : (
              <div className="flex h-full min-h-0 items-center justify-center rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                Bản dịch sẽ hiển thị ở đây.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
