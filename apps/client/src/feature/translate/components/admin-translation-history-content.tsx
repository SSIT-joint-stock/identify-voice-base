import {
  BarChart3,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  Languages,
  Loader2,
  Pencil,
  SearchX,
  X,
} from "lucide-react";
import type { ComponentProps } from "react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TranslateExportFormat } from "@/feature/translate/api/translate.api";
import { TranslationHistoryDatePicker } from "@/feature/translate/components/translation-history-date-picker";
import { TRANSLATION_LANGUAGES } from "@/feature/translate/constants/translate.constants";
import { useDownloadFormatDropdown } from "@/feature/translate/hooks/use-download-format-dropdown";
import type {
  TranslationHistoryRecord,
  TranslationHistoryResponse,
} from "@/feature/translate/types/translate.types";
import {
  formatDateTime,
  getFileTypeLabel,
  getLanguageLabel,
} from "@/feature/translate/utils/translation-history.utils";
import { cn } from "@/lib/utils";

export const ALL_TRANSLATION_LANGUAGES_FILTER = "all";
export const EFFECTIVE_TRANSLATION_VIEW = "effective";
export const ORIGINAL_TRANSLATION_VIEW = "original";

export type TranslationView =
  | typeof EFFECTIVE_TRANSLATION_VIEW
  | typeof ORIGINAL_TRANSLATION_VIEW;

interface TranslationDownloadDropdownProps {
  align?: ComponentProps<typeof PopoverContent>["align"];
  className?: string;
  disabled?: boolean;
  exportingFormat?: TranslateExportFormat | null;
  label?: string;
  onDownload: (format: TranslateExportFormat) => void | Promise<void>;
}

function TranslationDownloadDropdown({
  align = "end",
  className,
  disabled = false,
  exportingFormat = null,
  label = "Tải xuống",
  onDownload,
}: TranslationDownloadDropdownProps) {
  const isBusy = Boolean(exportingFormat);
  const dropdown = useDownloadFormatDropdown({
    disabled: disabled || isBusy,
    onDownload,
  });

  return (
    <Popover open={dropdown.open} onOpenChange={dropdown.setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("min-w-30 justify-between", className)}
          disabled={disabled || isBusy}
        >
          {isBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          <span>
            {isBusy ? `Đang tải ${exportingFormat?.toUpperCase()}` : label}
          </span>
          <ChevronDown className="size-4 text-slate-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-44 p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex flex-col">
          {dropdown.formats.map((format) => (
            <button
              key={format}
              type="button"
              className="flex h-9 items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
              onClick={() => void dropdown.selectFormat(format)}
            >
              <Download className="size-4 text-slate-500" />
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TranslationStatsCards({
  stats,
}: {
  stats?: TranslationHistoryResponse["stats"];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Languages className="size-4" />
          Tổng số lượt dịch
        </div>
        <div className="mt-2 text-3xl font-bold text-slate-900">
          {stats?.total ?? 0}
        </div>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <BarChart3 className="size-4" />
          Hôm nay
        </div>
        <div className="mt-2 text-3xl font-bold text-slate-900">
          {stats?.today_count ?? 0}
        </div>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-slate-500">
          Theo loại xử lý
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(stats?.by_mode ?? []).map((item) => (
            <Badge key={item.mode} variant="secondary">
              {item.mode === "SUMMARIZE" ? "Dịch tóm tắt" : "Dịch"}:{" "}
              {item.count}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TranslationHistoryFiltersProps {
  fromDate: string;
  onFromDateChange: (value: string) => void;
  onPageSizeChange: (value: 10 | 25 | 50) => void;
  onReset: () => void;
  onSourceLangChange: (value: string) => void;
  onTargetLangChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  pageSize: 10 | 25 | 50;
  sourceLang: string;
  targetLang: string;
  toDate: string;
}

export function TranslationHistoryFilters({
  fromDate,
  onFromDateChange,
  onPageSizeChange,
  onReset,
  onSourceLangChange,
  onTargetLangChange,
  onToDateChange,
  pageSize,
  sourceLang,
  targetLang,
  toDate,
}: TranslationHistoryFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-end">
      <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Từ ngày</p>
          <TranslationHistoryDatePicker
            value={fromDate}
            onChange={onFromDateChange}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Đến ngày</p>
          <TranslationHistoryDatePicker
            value={toDate}
            onChange={onToDateChange}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Ngôn ngữ nguồn
          </p>
          <Select value={sourceLang} onValueChange={onSourceLangChange}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TRANSLATION_LANGUAGES_FILTER}>
                Tất cả
              </SelectItem>
              {TRANSLATION_LANGUAGES.map((language) => (
                <SelectItem key={language.value} value={language.value}>
                  {language.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Ngôn ngữ dịch
          </p>
          <Select value={targetLang} onValueChange={onTargetLangChange}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TRANSLATION_LANGUAGES_FILTER}>
                Tất cả
              </SelectItem>
              {TRANSLATION_LANGUAGES.map((language) => (
                <SelectItem key={language.value} value={language.value}>
                  {language.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Số dòng</p>
          <Select
            value={String(pageSize)}
            onValueChange={(value) =>
              onPageSizeChange(Number(value) as 10 | 25 | 50)
            }
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 dòng</SelectItem>
              <SelectItem value="25">25 dòng</SelectItem>
              <SelectItem value="50">50 dòng</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onReset}
          >
            Xóa bộ lọc
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreparingContent() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 text-sm text-slate-500">
      <Loader2 className="size-6 animate-spin text-primary-500" />
      <span>Đang chuẩn bị nội dung...</span>
    </div>
  );
}

function useCopiedFeedback(activeKey: string) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const showCopied = () => {
    setCopiedKey(activeKey);
    window.setTimeout(() => {
      setCopiedKey((currentKey) =>
        currentKey === activeKey ? null : currentKey,
      );
    }, 1200);
  };

  return { isCopied: copiedKey === activeKey, showCopied };
}

interface TranslationHistoryTableProps {
  exportingRecord: { id: string; format: TranslateExportFormat } | null;
  isError: boolean;
  isLoading: boolean;
  items: TranslationHistoryRecord[];
  onDownload: (
    record: TranslationHistoryRecord,
    format: TranslateExportFormat,
  ) => void;
  onOpenRecord: (record: TranslationHistoryRecord) => void;
}

export function TranslationHistoryTable({
  exportingRecord,
  isError,
  isLoading,
  items,
  onDownload,
  onOpenRecord,
}: TranslationHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
        <SearchX className="size-10 text-red-400" />
        <p className="text-sm font-medium text-red-600">
          Không thể tải dữ liệu dịch.
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
        <SearchX className="size-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">
          Chưa có bản dịch phù hợp.
        </p>
      </div>
    );
  }

  return (
    <Table className="min-w-250 table-fixed">
      <TableHeader className="sticky top-0 z-10 bg-slate-50">
        <TableRow>
          <TableHead className="w-37.5">Thời gian</TableHead>
          <TableHead className="w-35">Người dịch</TableHead>
          <TableHead className="w-22.5">Luồng</TableHead>
          <TableHead className="w-30">Trạng thái</TableHead>
          <TableHead className="w-40">Ngôn ngữ</TableHead>
          <TableHead className="w-24">Loại tệp</TableHead>
          <TableHead className="w-50 text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            className="cursor-pointer"
            onClick={() => onOpenRecord(item)}
          >
            <TableCell className="whitespace-nowrap align-top text-sm">
              {formatDateTime(item.created_at)}
            </TableCell>
            <TableCell className="align-top text-sm">
              <span className="block truncate">
                {item.operator.username || item.operator.email || "-"}
              </span>
            </TableCell>
            <TableCell className="align-top">
              <Badge variant="outline">
                {item.mode === "SUMMARIZE" ? "Tóm tắt" : "Dịch"}
              </Badge>
            </TableCell>
            <TableCell className="align-top">
              {item.edited_at ? (
                <Badge variant="secondary">Đã chỉnh sửa</Badge>
              ) : (
                <Badge variant="outline" className="text-slate-500">
                  Bản gốc
                </Badge>
              )}
            </TableCell>
            <TableCell className="align-top text-sm">
              <span className="block truncate">
                {getLanguageLabel(item.source_lang)} {"->"}{" "}
                {getLanguageLabel(item.target_lang)}
              </span>
            </TableCell>
            <TableCell className="align-top">
              <Badge variant="secondary">
                {getFileTypeLabel(item.source_file_type)}
              </Badge>
            </TableCell>
            <TableCell className="align-top">
              <div
                className="flex justify-end"
                onClick={(event) => event.stopPropagation()}
              >
                <TranslationDownloadDropdown
                  disabled={Boolean(exportingRecord)}
                  exportingFormat={
                    exportingRecord?.id === item.id
                      ? exportingRecord.format
                      : null
                  }
                  onDownload={(format) => onDownload(item, format)}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface TranslationHistoryPaginationProps {
  canGoNext: boolean;
  canGoPrevious: boolean;
  firstRecordIndex: number;
  lastRecordIndex: number;
  onPageChange: (page: number) => void;
  page: number;
  paginationItems: ReadonlyArray<number | "ellipsis">;
  totalRecords: number;
}

export function TranslationHistoryPagination({
  canGoNext,
  canGoPrevious,
  firstRecordIndex,
  lastRecordIndex,
  onPageChange,
  page,
  paginationItems,
  totalRecords,
}: TranslationHistoryPaginationProps) {
  return (
    <div className="flex shrink-0 flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-muted-foreground">
        Hiển thị {firstRecordIndex}-{lastRecordIndex} / {totalRecords} bản dịch
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={!canGoPrevious}
              onClick={(event) => {
                event.preventDefault();
                if (!canGoPrevious) return;
                onPageChange(page - 1);
              }}
            />
          </PaginationItem>
          {paginationItems.map((item, index) =>
            item === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink
                  isActive={item === page}
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(item);
                  }}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              disabled={!canGoNext}
              onClick={(event) => {
                event.preventDefault();
                if (!canGoNext) return;
                onPageChange(page + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

interface SourceTextPanelProps {
  isContentLoading: boolean;
  onCopy: (text: string, successMessage: string) => boolean | Promise<boolean>;
  record: TranslationHistoryRecord;
}

export function SourceTextPanel({
  isContentLoading,
  onCopy,
  record,
}: SourceTextPanelProps) {
  const { isCopied, showCopied } = useCopiedFeedback(record.id);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-md border bg-white">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex items-center gap-2">
          <p className="text-base font-semibold text-slate-950">
            Văn bản nguồn
          </p>
          <p className="text-xs text-slate-500">
            {record.source_text.length.toLocaleString("vi-VN")} ký tự
          </p>
        </div>
      </div>
      <div className="relative h-[68vh] min-h-130">
        {isContentLoading ? (
          <PreparingContent />
        ) : (
          <>
            <pre className="multilingual-content h-full overflow-auto whitespace-pre-wrap bg-slate-50 p-4 pb-14 text-sm text-slate-700">
              {record.source_text}
            </pre>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="absolute right-4 bottom-4 bg-white/95 shadow-sm backdrop-blur hover:bg-white"
                  aria-label="Sao chép văn bản nguồn"
                  onClick={async () => {
                    const copied = await onCopy(
                      record.source_text,
                      "Đã sao chép văn bản gốc.",
                    );
                    if (copied) showCopied();
                  }}
                >
                  {isCopied ? (
                    <Check className="size-4 animate-in zoom-in-50 text-emerald-600 duration-200" />
                  ) : (
                    <Copy className="size-4 animate-in fade-in-0 duration-150" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Sao chép văn bản nguồn
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
}

interface TranslatedTextPanelProps {
  canEditTranslation: boolean;
  canViewOriginalTranslation: boolean;
  detailTranslatedText: string;
  draftTranslatedText: string;
  exportingFormat: TranslateExportFormat | null;
  isContentLoading: boolean;
  isEditingTranslation: boolean;
  isSavingTranslation: boolean;
  isViewTooltipOpen: boolean;
  isViewTooltipSuppressed: boolean;
  onCancelEditing: () => void;
  onCopy: (text: string, successMessage: string) => boolean | Promise<boolean>;
  onDownload: (format: TranslateExportFormat) => void;
  onDraftChange: (value: string) => void;
  onSaveEditing: () => void;
  onStartEditing: () => void;
  onToggleView: () => void;
  onViewTooltipOpenChange: (open: boolean) => void;
  onViewTooltipSuppressChange: (suppressed: boolean) => void;
  record: TranslationHistoryRecord;
  translationView: TranslationView;
}

export function TranslatedTextPanel({
  canEditTranslation,
  canViewOriginalTranslation,
  detailTranslatedText,
  draftTranslatedText,
  exportingFormat,
  isContentLoading,
  isEditingTranslation,
  isSavingTranslation,
  isViewTooltipOpen,
  isViewTooltipSuppressed,
  onCancelEditing,
  onCopy,
  onDownload,
  onDraftChange,
  onSaveEditing,
  onStartEditing,
  onToggleView,
  onViewTooltipOpenChange,
  onViewTooltipSuppressChange,
  record,
  translationView,
}: TranslatedTextPanelProps) {
  const { isCopied, showCopied } = useCopiedFeedback(record.id);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-md border bg-white">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-base font-semibold text-slate-950">Bản dịch</p>
          <span className="text-xs text-slate-500">
            {detailTranslatedText.length.toLocaleString("vi-VN")} ký tự
          </span>
          {record.edited_at ? (
            <Badge variant="secondary">Đã chỉnh sửa</Badge>
          ) : null}
          {translationView === ORIGINAL_TRANSLATION_VIEW ? (
            <Badge variant="outline">Bản gốc</Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {canEditTranslation ? (
            isEditingTranslation ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSavingTranslation}
                  onClick={onCancelEditing}
                >
                  <X className="size-4" />
                  Hủy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSavingTranslation}
                  onClick={onSaveEditing}
                >
                  {isSavingTranslation ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Lưu
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onStartEditing}
              >
                <Pencil className="size-4" />
                Chỉnh sửa
              </Button>
            )
          ) : null}
          <TranslationDownloadDropdown
            disabled={
              Boolean(exportingFormat) ||
              isEditingTranslation ||
              isSavingTranslation
            }
            exportingFormat={exportingFormat}
            onDownload={onDownload}
          />
        </div>
      </div>
      {isContentLoading ? (
        <div className="h-[68vh] min-h-[520px]">
          <PreparingContent />
        </div>
      ) : isEditingTranslation ? (
        <div className="h-[68vh] min-h-[520px] overflow-auto bg-slate-50 p-4">
          <Textarea
            autoFocus
            rows={18}
            value={draftTranslatedText}
            disabled={isSavingTranslation}
            onChange={(event) => onDraftChange(event.target.value)}
            className="multilingual-content min-h-full resize-none border-slate-200 bg-white text-sm text-slate-700 shadow-none"
          />
        </div>
      ) : (
        <div className="relative h-[68vh] min-h-[520px]">
          <pre className="multilingual-content h-full overflow-auto whitespace-pre-wrap bg-slate-50 p-4 pb-14 text-sm text-slate-700">
            {detailTranslatedText}
          </pre>
          <div className="absolute right-4 bottom-4 flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="bg-white/95 shadow-sm backdrop-blur hover:bg-white"
                  disabled={isSavingTranslation}
                  aria-label="Sao chép bản dịch"
                  onClick={async () => {
                    const copied = await onCopy(
                      detailTranslatedText,
                      "Đã sao chép bản dịch.",
                    );
                    if (copied) showCopied();
                  }}
                >
                  {isCopied ? (
                    <Check className="size-4 animate-in zoom-in-50 text-emerald-600 duration-200" />
                  ) : (
                    <Copy className="size-4 animate-in fade-in-0 duration-150" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Sao chép bản dịch
              </TooltipContent>
            </Tooltip>
            {canViewOriginalTranslation ? (
              <Tooltip
                open={isViewTooltipSuppressed ? false : isViewTooltipOpen}
                onOpenChange={(open) => {
                  if (isViewTooltipSuppressed && open) return;
                  onViewTooltipOpenChange(open);
                }}
              >
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="bg-white/95 shadow-sm backdrop-blur hover:bg-white"
                    disabled={isSavingTranslation}
                    aria-label={
                      translationView === ORIGINAL_TRANSLATION_VIEW
                        ? "Quay lại bản đã chỉnh sửa"
                        : "Xem bản dịch gốc"
                    }
                    onPointerLeave={() => {
                      onViewTooltipSuppressChange(false);
                      onViewTooltipOpenChange(false);
                    }}
                    onClick={onToggleView}
                  >
                    {translationView === ORIGINAL_TRANSLATION_VIEW ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  {translationView === ORIGINAL_TRANSLATION_VIEW
                    ? "Quay lại bản đã chỉnh sửa"
                    : "Xem bản dịch gốc"}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
