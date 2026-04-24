import {
  Copy,
  FileText,
  Languages,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PageLayout } from "@/components/PageLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { TranslateAudioPreview } from "@/feature/translate/components/translate-audio-preview";
import { TranslateFileDropzone } from "@/feature/translate/components/translate-file-dropzone";
import {
  AUTO_LANGUAGE,
  OCR_LANGUAGES,
  SPEECH_LANGUAGES,
  TRANSLATION_LANGUAGES,
} from "@/feature/translate/constants/translate.constants";
import type {
  SelectedTranslateFile,
  TranslateMode,
} from "@/feature/translate/types/translate.types";
import {
  getOcrText,
  getTranscriptText,
} from "@/feature/translate/utils/translate-file.utils";
import { formatError } from "@/utils";

type ProcessingStep = "idle" | "extracting" | "translating";

export default function TranslateFile() {
  const translateFormRef = useRef<HTMLDivElement | null>(null);
  const [selectedFile, setSelectedFile] =
    useState<SelectedTranslateFile | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState(AUTO_LANGUAGE);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [mode, setMode] = useState<TranslateMode>("translate");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle");

  const isBusy = processingStep !== "idle";
  const isAudio = selectedFile?.kind === "audio";
  const hasFile = Boolean(selectedFile);
  const hasSourceText = sourceText.trim().length > 0;
  const outputTitle = mode === "summarize" ? "Bản dịch tóm tắt" : "Bản dịch";

  const sourceLanguageOptions = useMemo(
    () => (isAudio ? SPEECH_LANGUAGES : OCR_LANGUAGES),
    [isAudio],
  );

  useEffect(() => {
    if (!selectedFile) return;

    const frameId = window.requestAnimationFrame(() => {
      translateFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedFile]);

  const resetResult = () => {
    setSourceText("");
    setTranslatedText("");
    setErrorMessage(null);
  };

  const resetPage = () => {
    setSelectedFile(null);
    setSourceLanguage(AUTO_LANGUAGE);
    setTargetLanguage("en");
    setMode("translate");
    setProcessingStep("idle");
    resetResult();
  };

  const extractText = async (
    file = selectedFile,
    language = sourceLanguage,
  ) => {
    if (!file || processingStep !== "idle") return "";

    setProcessingStep("extracting");
    setErrorMessage(null);
    setTranslatedText("");

    try {
      if (file.kind === "audio") {
        const result = await translateApi.speechToText({
          file: file.file,
          language: language === AUTO_LANGUAGE ? undefined : language,
        });
        const text = getTranscriptText(result.transcript);

        setSourceText(text);
        toast.success("Đã nhận dạng audio.");
        return text;
      }

      const result = await translateApi.ocr({
        file: file.file,
        language,
      });
      const text = getOcrText(result.results);

      setSourceText(text);
      toast.success("Đã trích xuất văn bản.");
      return text;
    } catch (error) {
      const message = formatError(error);
      setErrorMessage(message);
      toast.error(message);
      return "";
    } finally {
      setProcessingStep("idle");
    }
  };

  const translateText = async (
    text = sourceText,
    translateMode = mode,
    translateTargetLanguage = targetLanguage,
  ) => {
    const normalizedText = text.trim();
    if (!normalizedText || processingStep !== "idle") return;

    setProcessingStep("translating");
    setErrorMessage(null);

    try {
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

      setTranslatedText(result.translated_text ?? "");
      toast.success(
        translateMode === "summarize"
          ? "Đã dịch và tóm tắt nội dung."
          : "Đã dịch nội dung.",
      );
    } catch (error) {
      const message = formatError(error);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setProcessingStep("idle");
    }
  };

  const processFile = async (
    file = selectedFile,
    language = sourceLanguage,
    translateMode = mode,
    translateTargetLanguage = targetLanguage,
  ) => {
    const extractedText = await extractText(file, language);
    if (!extractedText.trim()) return;

    await translateText(extractedText, translateMode, translateTargetLanguage);
  };

  const handleSelectedFileChange = (nextFile: SelectedTranslateFile | null) => {
    const nextSourceLanguage =
      nextFile?.kind === "audio" ? AUTO_LANGUAGE : "vi";

    setSelectedFile(nextFile);
    setSourceLanguage(nextSourceLanguage);
    resetResult();

    if (nextFile) {
      void processFile(nextFile, nextSourceLanguage, mode, targetLanguage);
    }
  };

  const handleModeChange = (value: string) => {
    const nextMode = value as TranslateMode;

    setMode(nextMode);

    if (!sourceText.trim() || isBusy) return;

    void translateText(sourceText, nextMode, targetLanguage);
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
      title="Dịch tệp tin"
      description="Tải audio, PDF, DOCX, TXT hoặc ảnh để trích xuất và dịch nội dung."
      titleClassName="font-playfair text-[34px] leading-[1.1] font-bold tracking-tight text-[#4b1d18] md:text-[42px]"
      onRefresh={resetPage}
    >
      <Card className="rounded-md">
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
        <TranslateAudioPreview file={selectedFile?.file ?? null} />
      ) : null}

      {hasFile ? (
        <Card className="rounded-md">
          <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="translate-source-language">
                  {isAudio ? "Ngôn ngữ audio" : "Ngôn ngữ OCR"}
                </Label>
                <Select
                  value={sourceLanguage}
                  onValueChange={setSourceLanguage}
                  disabled={isBusy}
                >
                  <SelectTrigger
                    id="translate-source-language"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceLanguageOptions.map((language) => (
                      <SelectItem key={language.value} value={language.value}>
                        {language.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="translate-target-language">Dịch sang</Label>
                <Select
                  value={targetLanguage}
                  onValueChange={setTargetLanguage}
                  disabled={isBusy}
                >
                  <SelectTrigger
                    id="translate-target-language"
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

            <div className="flex flex-wrap items-center gap-3">
              <Tabs value={mode} onValueChange={handleModeChange}>
                <TabsList>
                  <TabsTrigger value="translate" disabled={isBusy}>
                    <Languages className="size-4" />
                    Dịch
                  </TabsTrigger>
                  <TabsTrigger value="summarize" disabled={isBusy}>
                    <Sparkles className="size-4" />
                    Tóm tắt
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button
                type="button"
                variant="outline"
                className="shadow-lg shadow-slate-200/80 transition-shadow hover:shadow-xl hover:shadow-slate-300/80"
                disabled={!selectedFile || isBusy}
                onClick={() => void processFile()}
              >
                {processingStep === "extracting" ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 size-4" />
                )}
                {processingStep === "extracting"
                  ? "Đang trích xuất..."
                  : selectedFile?.kind === "audio"
                    ? "Nhận dạng audio"
                    : "Trích xuất văn bản"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Không thể xử lý yêu cầu</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {hasFile ? (
        <div ref={translateFormRef} className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-md">
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
                  disabled={!hasSourceText || isBusy}
                  onClick={() => {
                    setSourceText("");
                    setTranslatedText("");
                  }}
                >
                  <RotateCcw className="mr-2 size-4" />
                  Xóa
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Textarea
                value={sourceText}
                onChange={(event) => {
                  setSourceText(event.target.value);
                  setTranslatedText("");
                }}
                disabled={isBusy}
                placeholder="Nội dung trích xuất sẽ hiển thị tại đây."
                className="h-94 min-h-94 max-h-94 resize-none overflow-y-auto p-4 text-sm leading-6"
              />
              <div className="flex justify-end">
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
                    ? "Đang dịch..."
                    : "Dịch văn bản"}
                </Button>
              </div>
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
              {processingStep === "translating" ? (
                <div className="flex h-94 min-h-94 max-h-94 flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  <LoaderCircle className="size-8 animate-spin text-primary-500" />
                  <span>Đang dịch nội dung...</span>
                </div>
              ) : translatedText ? (
                <div className="h-94 min-h-94 max-h-94 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-6">
                  {translatedText}
                </div>
              ) : (
                <div className="flex h-94 min-h-94 max-h-94 items-center justify-center rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  Bản dịch sẽ hiển thị ở đây.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PageLayout>
  );
}
