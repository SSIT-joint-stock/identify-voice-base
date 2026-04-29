import {
  Copy,
  Download,
  FileText,
  Languages,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { TranslateExportFormat } from "@/feature/translate/api/translate.api";
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
import {
  animateProgressTo,
  formatError,
  TRANSLATE_JOB_POLL_INTERVAL_MS,
  wait,
  type ProcessingStep,
} from "@/utils";

function getDetectedLanguageCode(
  detectedLanguages?: string | string[],
): string | null {
  const rawLanguage = Array.isArray(detectedLanguages)
    ? detectedLanguages[0]
    : detectedLanguages;
  const normalizedLanguage = rawLanguage?.trim();

  return normalizedLanguage || null;
}

function getLanguageLabel(languageCode: string) {
  return (
    TRANSLATION_LANGUAGES.find((language) => language.value === languageCode)
      ?.label ?? languageCode
  );
}

export default function TranslateFile() {
  const translateFormRef = useRef<HTMLDivElement | null>(null);
  const translateProgressRef = useRef(0);
  const [selectedFile, setSelectedFile] =
    useState<SelectedTranslateFile | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState(AUTO_LANGUAGE);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [returnTimestamp, setReturnTimestamp] = useState(false);
  const [denoiseAudio, setDenoiseAudio] = useState(false);
  const [mode, setMode] = useState<TranslateMode>("translate");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle");
  const [translateProgress, setTranslateProgress] = useState(0);
  const [exportingFormat, setExportingFormat] =
    useState<TranslateExportFormat | null>(null);

  const isBusy = processingStep !== "idle";
  const isAudio = selectedFile?.kind === "audio";
  const hasFile = Boolean(selectedFile);
  const hasSourceText = sourceText.trim().length > 0;
  const outputTitle = mode === "summarize" ? "Bản dịch tóm tắt" : "Bản dịch";

  const updateTranslateProgress = useCallback((progress: number) => {
    translateProgressRef.current = progress;
    setTranslateProgress(progress);
  }, []);

  const sourceLanguageOptions = useMemo(() => {
    const baseOptions = isAudio ? SPEECH_LANGUAGES : OCR_LANGUAGES;

    if (
      sourceLanguage !== AUTO_LANGUAGE &&
      !baseOptions.some((language) => language.value === sourceLanguage)
    ) {
      return [
        ...baseOptions,
        {
          value: sourceLanguage,
          label: getLanguageLabel(sourceLanguage),
        },
      ];
    }

    return baseOptions;
  }, [isAudio, sourceLanguage]);

  const detectSourceLanguage = async (text: string) => {
    const normalizedText = text.trim();
    if (!normalizedText) return null;

    try {
      const result = await translateApi.detectLanguage({
        text: normalizedText,
      });
      const detectedLanguage = getDetectedLanguageCode(
        result.detected_languages,
      );

      if (detectedLanguage) {
        setSourceLanguage(detectedLanguage);
      }

      return detectedLanguage;
    } catch {
      toast.warning("Không thể tự nhận diện ngôn ngữ nguồn.");
      return null;
    }
  };

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
    updateTranslateProgress(0);
  };

  const resetPage = () => {
    setSelectedFile(null);
    setSourceLanguage(AUTO_LANGUAGE);
    setTargetLanguage("en");
    setReturnTimestamp(false);
    setDenoiseAudio(false);
    setMode("translate");
    setProcessingStep("idle");
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
    setTranslatedText("");

    const loadingToastId = toast.loading(
      file.kind === "audio"
        ? "Đang nhận dạng audio bằng S2T..."
        : "Đang trích xuất văn bản bằng OCR...",
    );

    try {
      if (file.kind === "audio") {
        const result = await translateApi.speechToText({
          file: file.file,
          language: language === AUTO_LANGUAGE ? undefined : language,
          returnTimestamp: shouldReturnTimestamp,
          denoiseAudio: shouldDenoiseAudio,
        });
        const text = getTranscriptText(result.transcript);
        const detectedLanguage =
          result.language ?? (await detectSourceLanguage(text));

        if (detectedLanguage) {
          setSourceLanguage(detectedLanguage);
        }
        setSourceText(text);
        toast.success("Đã nhận dạng audio.", {
          id: loadingToastId,
        });
        return text;
      }

      const result = await translateApi.ocr({
        file: file.file,
        language,
      });
      const text = getOcrText(result.results);
      await detectSourceLanguage(text);

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
    updateTranslateProgress(0);
    setErrorMessage(null);

    try {
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

      while (true) {
        const jobStatus = await translateApi.getTranslateJob(job.job_id);

        if (jobStatus.status === "completed") {
          await animateProgressTo(
            translateProgressRef.current,
            100,
            updateTranslateProgress,
          );
          setTranslatedText(jobStatus.result?.translated_text ?? "");
          break;
        }

        await animateProgressTo(
          translateProgressRef.current,
          jobStatus.progress,
          updateTranslateProgress,
        );

        if (jobStatus.status === "failed") {
          throw new Error(jobStatus.error ?? "Không thể dịch nội dung.");
        }

        await wait(TRANSLATE_JOB_POLL_INTERVAL_MS);
      }

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

  const handleSelectedFileChange = (nextFile: SelectedTranslateFile | null) => {
    const nextSourceLanguage =
      nextFile?.kind === "audio" ? AUTO_LANGUAGE : "vi";

    setSelectedFile(nextFile);
    setSourceLanguage(nextSourceLanguage);
    setReturnTimestamp(false);
    setDenoiseAudio(false);
    resetResult();

    if (nextFile) {
      void extractText(nextFile, nextSourceLanguage, false, false);
    }
  };

  const handleReturnTimestampChange = (value: string) => {
    setReturnTimestamp(value === "true");
    setSourceText("");
    setTranslatedText("");
    updateTranslateProgress(0);
  };

  const handleDenoiseAudioChange = (value: string) => {
    setDenoiseAudio(value === "true");
    setSourceText("");
    setTranslatedText("");
    updateTranslateProgress(0);
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

  const getExportFilename = () => {
    const sourceName = selectedFile?.file.name.replace(/\.[^.]+$/, "").trim();
    const prefix = mode === "summarize" ? "ban-dich-tom-tat" : "ban-dich";

    return sourceName ? `${prefix}-${sourceName}` : prefix;
  };

  const downloadTranslatedFile = async (format: TranslateExportFormat) => {
    const text = translatedText.trim();
    if (!text || exportingFormat) return;

    setExportingFormat(format);

    try {
      const blob = await translateApi.exportTranslation({
        text,
        format,
        filename: getExportFilename(),
        title: outputTitle,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${getExportFilename()}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Đã tải ${format.toUpperCase()}.`);
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setExportingFormat(null);
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
          <CardContent className="flex flex-col gap-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                      <SelectItem value="false">Không trả timestamp</SelectItem>
                      <SelectItem value="true">Trả timestamp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {isAudio ? (
                <div className="space-y-2">
                  <Label htmlFor="translate-denoise-audio">Khử nhiễu</Label>
                  <Select
                    value={String(denoiseAudio)}
                    onValueChange={handleDenoiseAudioChange}
                    disabled={isBusy}
                  >
                    <SelectTrigger
                      id="translate-denoise-audio"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Không khử nhiễu</SelectItem>
                      <SelectItem value="true">Khử nhiễu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

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

            <div className="flex flex-wrap items-center justify-end gap-3">
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
                onClick={() => void extractText()}
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
                    updateTranslateProgress(0);
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
                  updateTranslateProgress(0);
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
                    ? `Đang dịch... ${translateProgress}%`
                    : "Dịch văn bản"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>{outputTitle}</CardTitle>

              <div className="flex flex-wrap gap-2 sm:justify-end">
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

                <Button
                  type="button"
                  variant="outline"
                  disabled={!translatedText.trim() || Boolean(exportingFormat)}
                  onClick={() => void downloadTranslatedFile("docx")}
                >
                  {exportingFormat === "docx" ? (
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 size-4" />
                  )}
                  DOCX
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={!translatedText.trim() || Boolean(exportingFormat)}
                  onClick={() => void downloadTranslatedFile("pdf")}
                >
                  {exportingFormat === "pdf" ? (
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 size-4" />
                  )}
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {processingStep === "translating" ? (
                <div className="flex h-94 min-h-94 max-h-94 flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
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
