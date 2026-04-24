import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Languages,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";

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
import { formatError } from "@/utils";

const AUTO_DETECT_ERROR_MESSAGE = "Không thể tự động nhận diện ngôn ngữ nguồn.";

function getDetectedLanguageCode(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value.find((item) => item.trim())?.trim() ?? null;
  }

  if (typeof value !== "string") {
    return null;
  }

  return (
    value
      .split(",")
      .map((item) => item.trim())
      .find(Boolean) ?? null
  );
}

export default function TranslateLive() {
  const translateRequestIdRef = useRef(0);
  const [sourceLanguage, setSourceLanguage] = useState(AUTO_LANGUAGE);
  const [targetLanguage, setTargetLanguage] = useState("vi");
  const [mode, setMode] = useState<TranslateMode>("translate");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  const hasSourceText = sourceText.trim().length > 0;
  const outputTitle = mode === "summarize" ? "Bản dịch tóm tắt" : "Bản dịch";

  const resetPage = () => {
    translateRequestIdRef.current += 1;
    setSourceLanguage(AUTO_LANGUAGE);
    setTargetLanguage("vi");
    setMode("translate");
    setSourceText("");
    setTranslatedText("");
    setIsTranslating(false);
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
      setTranslatedText("");

      try {
        if (sourceLanguage === AUTO_LANGUAGE) {
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

        const result =
          translateMode === "summarize"
            ? await translateApi.translateSummarize({
                sourceText: normalizedText,
                targetLang: translateTargetLanguage,
              })
            : await translateApi.translate({
                sourceText: normalizedText,
                targetLang: translateTargetLanguage,
              });

        if (requestId !== translateRequestIdRef.current) return;

        setTranslatedText(result.translated_text ?? "");
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
    [sourceLanguage],
  );

  useEffect(() => {
    const normalizedText = sourceText.trim();

    if (!normalizedText) {
      translateRequestIdRef.current += 1;
      setTranslatedText("");
      setIsTranslating(false);
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
  }, [mode, runTranslate, sourceText, targetLanguage]);

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
      onRefresh={resetPage}
    >
      <Card className="gap-0 rounded-md py-5">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-md">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Văn bản nguồn</CardTitle>

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
                }}
              >
                <RotateCcw className="mr-2 size-4" />
                Xóa
              </Button>

              <Button
                type="button"
                disabled={!hasSourceText || isTranslating}
                onClick={() => void translateText()}
              >
                {isTranslating ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <Languages className="mr-2 size-4" />
                )}
                {isTranslating ? "Đang dịch..." : "Dịch văn bản"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={sourceText}
              onChange={(event) => {
                setSourceText(event.target.value);
                setTranslatedText("");
              }}
              placeholder="Nhập văn bản cần dịch tại đây."
              className="h-90 min-h-90 resize-y p-4 text-sm leading-6"
            />
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <CardContent>
            {isTranslating ? (
              <div className="flex h-90 min-h-90 flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                <LoaderCircle className="size-8 animate-spin text-primary-500" />
                <span>Đang dịch nội dung...</span>
              </div>
            ) : translatedText ? (
              <div className="h-90 min-h-90 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-6">
                {translatedText}
              </div>
            ) : (
              <div className="flex h-90 min-h-90 items-center justify-center rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                Bản dịch sẽ hiển thị ở đây.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
