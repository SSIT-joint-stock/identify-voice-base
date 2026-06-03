import { FileText, Languages, LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProcessingStep } from "@/utils";
import type { TranslateMode } from "../types/translate.types";

interface TranslateFileOptionsCardProps {
  className?: string;
  detectedSourceLanguageConfidence: string | null;
  detectedSourceLanguageLabel: string | null;
  denoiseAudio?: boolean;
  disabled: boolean;
  idPrefix?: string;
  isAudio: boolean;
  mode: TranslateMode;
  processingStep: ProcessingStep;
  returnTimestamp?: boolean;
  showAudioOptions?: boolean;
  showExtractButton?: boolean;
  sourceLanguage: string;
  sourceLanguageLabel: string;
  sourceLanguageOptions: readonly ComboboxOption[];
  targetLanguage: string;
  targetLanguageOptions: readonly ComboboxOption[];
  canExtract?: boolean;
  onDenoiseAudioChange?: (value: string) => void;
  onExtractText?: () => void;
  onModeChange: (value: string) => void;
  onReturnTimestampChange?: (value: string) => void;
  onSourceLanguageChange: (value: string) => void;
  onTargetLanguageChange: (value: string) => void;
}

export function TranslateFileOptionsCard({
  className,
  detectedSourceLanguageConfidence,
  detectedSourceLanguageLabel,
  denoiseAudio = false,
  disabled,
  idPrefix = "translate",
  isAudio,
  mode,
  processingStep,
  returnTimestamp = false,
  showAudioOptions = isAudio,
  showExtractButton = !isAudio,
  sourceLanguage,
  sourceLanguageLabel,
  sourceLanguageOptions,
  targetLanguage,
  targetLanguageOptions,
  canExtract = false,
  onDenoiseAudioChange,
  onExtractText,
  onModeChange,
  onReturnTimestampChange,
  onSourceLanguageChange,
  onTargetLanguageChange,
}: TranslateFileOptionsCardProps) {
  return (
    <Card className={`translation-surface py-5 ${className ?? ""}`}>
      <CardContent
        className={`flex flex-col gap-4 ${
          showAudioOptions
            ? "xl:flex-row xl:items-end xl:justify-between"
            : "lg:flex-row lg:items-end lg:justify-between"
        }`}
      >
        <div
          className={`grid flex-1 gap-3 sm:grid-cols-2 ${
            showAudioOptions ? "xl:max-w-6xl xl:grid-cols-4" : "lg:max-w-2xl"
          }`}
        >
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-source-language`}>
              {sourceLanguageLabel}
            </Label>
            <Combobox
              id={`${idPrefix}-source-language`}
              value={sourceLanguage}
              onValueChange={onSourceLanguageChange}
              options={sourceLanguageOptions}
              disabled={disabled}
              searchPlaceholder="Tìm ngôn ngữ nguồn..."
              emptyMessage="Không tìm thấy ngôn ngữ nguồn"
            />
            {detectedSourceLanguageLabel ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-md border border-border px-2 py-0.5">
                  {`Ngôn ngữ phát hiện: ${detectedSourceLanguageLabel}`}
                </span>
                {detectedSourceLanguageConfidence ? (
                  <span className="rounded-md border border-border px-2 py-0.5">
                    {`Độ chính xác: ${detectedSourceLanguageConfidence}`}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {showAudioOptions ? (
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-return-timestamp`}>Timestamp</Label>
              <Select
                value={String(returnTimestamp)}
                onValueChange={onReturnTimestampChange}
                disabled={disabled}
              >
                <SelectTrigger
                  id={`${idPrefix}-return-timestamp`}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Không trả timestamp</SelectItem>
                  <SelectItem value="true">Trả timestamp</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Timestamp chỉ trả về khi S2T ngôn ngữ nước ngoài, hiện chưa hỗ
                trợ tiếng Việt.
              </p>
            </div>
          ) : null}

          {showAudioOptions ? (
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-denoise-audio`}>Khử nhiễu</Label>
              <Select
                value={String(denoiseAudio)}
                onValueChange={onDenoiseAudioChange}
                disabled={disabled}
              >
                <SelectTrigger
                  id={`${idPrefix}-denoise-audio`}
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
            <Label htmlFor={`${idPrefix}-target-language`}>Dịch sang</Label>
            <Combobox
              id={`${idPrefix}-target-language`}
              value={targetLanguage}
              onValueChange={onTargetLanguageChange}
              options={targetLanguageOptions}
              disabled={disabled}
              searchPlaceholder="Tìm ngôn ngữ dịch..."
              emptyMessage="Không tìm thấy ngôn ngữ dịch"
            />
          </div>
        </div>

        <div
          className={`flex shrink-0 flex-wrap items-center gap-3 ${
            showAudioOptions ? "xl:justify-end" : "lg:justify-end"
          }`}
        >
          <Tabs value={mode} onValueChange={onModeChange}>
            <TabsList>
              <TabsTrigger value="translate" disabled={disabled}>
                <Languages className="size-4" />
                Dịch
              </TabsTrigger>
              <TabsTrigger value="summarize" disabled={disabled}>
                <Sparkles className="size-4" />
                Tóm tắt
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {showExtractButton ? (
            <Button
              type="button"
              variant="outline"
              className="shadow-lg shadow-slate-200/80 transition-shadow hover:shadow-xl hover:shadow-slate-300/80"
              disabled={!canExtract || disabled}
              onClick={onExtractText}
            >
              {processingStep === "extracting" ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <FileText className="mr-2 size-4" />
              )}
              {processingStep === "extracting"
                ? "Đang trích xuất..."
                : "Trích xuất văn bản"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
