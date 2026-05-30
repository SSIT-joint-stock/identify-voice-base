import { FileText, Languages, LoaderCircle, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

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
  detectedSourceLanguageLabel: string | null;
  denoiseAudio: boolean;
  disabled: boolean;
  isAudio: boolean;
  mode: TranslateMode;
  processingStep: ProcessingStep;
  returnTimestamp: boolean;
  sourceLanguage: string;
  sourceLanguageLabel: string;
  sourceLanguageOptions: readonly ComboboxOption[];
  targetLanguage: string;
  targetLanguageOptions: readonly ComboboxOption[];
  canExtract: boolean;
  actionSlot?: ReactNode;
  showExtractButton?: boolean;
  showModeTabs?: boolean;
  onDenoiseAudioChange: (value: string) => void;
  onExtractText: () => void;
  onModeChange: (value: string) => void;
  onReturnTimestampChange: (value: string) => void;
  onSourceLanguageChange: (value: string) => void;
  onTargetLanguageChange: (value: string) => void;
}

export function TranslateFileOptionsCard({
  detectedSourceLanguageLabel,
  denoiseAudio,
  disabled,
  isAudio,
  mode,
  processingStep,
  returnTimestamp,
  sourceLanguage,
  sourceLanguageLabel,
  sourceLanguageOptions,
  targetLanguage,
  targetLanguageOptions,
  canExtract,
  actionSlot,
  showExtractButton = true,
  showModeTabs = true,
  onDenoiseAudioChange,
  onExtractText,
  onModeChange,
  onReturnTimestampChange,
  onSourceLanguageChange,
  onTargetLanguageChange,
}: TranslateFileOptionsCardProps) {
  return (
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
              onValueChange={onSourceLanguageChange}
              options={sourceLanguageOptions}
              disabled={disabled}
              searchPlaceholder="Tìm ngôn ngữ nguồn..."
              emptyMessage="Không tìm thấy ngôn ngữ nguồn"
            />
            {detectedSourceLanguageLabel ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-md border border-border px-2 py-0.5">
                  {`Nhận diện: ${detectedSourceLanguageLabel}`}
                </span>
              </div>
            ) : null}
          </div>

          {isAudio ? (
            <div className="space-y-2">
              <Label htmlFor="translate-return-timestamp">Timestamp</Label>
              <Select
                value={String(returnTimestamp)}
                onValueChange={onReturnTimestampChange}
                disabled={disabled}
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
              <p className="text-xs text-muted-foreground">
                Timestamp chỉ trả về khi S2T ngôn ngữ nước ngoài, hiện chưa hỗ
                trợ tiếng Việt.
              </p>
            </div>
          ) : null}

          {isAudio ? (
            <div className="space-y-2">
              <Label htmlFor="translate-denoise-audio">Khử nhiễu</Label>
              <Select
                value={String(denoiseAudio)}
                onValueChange={onDenoiseAudioChange}
                disabled={disabled}
              >
                <SelectTrigger id="translate-denoise-audio" className="w-full">
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
            <Combobox
              id="translate-target-language"
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
            isAudio ? "xl:justify-end" : "lg:justify-end"
          }`}
        >
          {showModeTabs ? (
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
          ) : null}

          {showExtractButton && !isAudio ? (
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

          {actionSlot}
        </div>
      </CardContent>
    </Card>
  );
}
