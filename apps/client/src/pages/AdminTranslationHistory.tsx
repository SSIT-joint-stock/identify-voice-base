import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Languages,
  Loader2,
  SearchX,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageLayout } from "@/components/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { QUERY_KEYS } from "@/constants";
import type { TranslateExportFormat } from "@/feature/translate/api/translate.api";
import { translateApi } from "@/feature/translate/api/translate.api";
import { TRANSLATION_LANGUAGES } from "@/feature/translate/constants/translate.constants";
import type {
  TranslationHistoryMode,
  TranslationHistoryRecord,
} from "@/feature/translate/types/translate.types";
import { formatError } from "@/utils";

const ALL_LANGUAGES = "all";
const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function parseDateValue(value: string) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  const date = parseDateValue(value);
  if (!date) return "Chọn ngày";

  return date.toLocaleDateString("vi-VN");
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;

  return [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function getLanguageLabel(languageCode?: string | null) {
  if (!languageCode) return "Tự động";

  return (
    TRANSLATION_LANGUAGES.find((language) => language.value === languageCode)
      ?.label ?? languageCode
  );
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis", totalPages] as const;
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      "ellipsis",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ] as const;
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ] as const;
}

function getExportTitle(mode: TranslationHistoryMode) {
  return mode === "SUMMARIZE" ? "Bản dịch tóm tắt" : "Bản dịch";
}

function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedDate = parseDateValue(value);
  const [open, setOpen] = useState(false);
  const [monthDate, setMonthDate] = useState(selectedDate ?? new Date());
  const calendarDays = getCalendarDays(monthDate);

  const updateMonth = (offset: number) => {
    setMonthDate(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start bg-white text-left font-normal"
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {formatDateLabel(value)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="mb-3 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => updateMonth(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="text-sm font-semibold">
            {monthDate.toLocaleDateString("vi-VN", {
              month: "long",
              year: "numeric",
            })}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => updateMonth(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-1">
              {label}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="size-8" />;
            }

            const date = new Date(
              monthDate.getFullYear(),
              monthDate.getMonth(),
              day,
            );
            const nextValue = formatDateValue(date);
            const isSelected = nextValue === value;

            return (
              <Button
                key={nextValue}
                type="button"
                variant={isSelected ? "default" : "ghost"}
                size="icon-sm"
                className="size-8"
                onClick={() => {
                  onChange(nextValue);
                  setOpen(false);
                }}
              >
                {day}
              </Button>
            );
          })}
        </div>

        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-center"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            <X className="size-4" />
            Xóa ngày
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export default function AdminTranslationHistory() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(10);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sourceLang, setSourceLang] = useState(ALL_LANGUAGES);
  const [targetLang, setTargetLang] = useState(ALL_LANGUAGES);
  const [exportingRecord, setExportingRecord] = useState<{
    id: string;
    format: TranslateExportFormat;
  } | null>(null);
  const [selectedRecord, setSelectedRecord] =
    useState<TranslationHistoryRecord | null>(null);

  const historyQuery = useQuery({
    queryKey: QUERY_KEYS.translate.history.list({
      page,
      pageSize,
      fromDate,
      toDate,
      sourceLang,
      targetLang,
    }),
    queryFn: () =>
      translateApi.getTranslationHistory({
        page,
        page_size: pageSize,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        source_lang: sourceLang === ALL_LANGUAGES ? undefined : sourceLang,
        target_lang: targetLang === ALL_LANGUAGES ? undefined : targetLang,
      }),
  });

  const items = historyQuery.data?.items ?? [];
  const stats = historyQuery.data?.stats;
  const pagination = historyQuery.data?.pagination;
  const totalRecords = pagination?.total ?? stats?.total ?? 0;
  const totalPages = Math.max(1, pagination?.total_pages ?? 1);
  const paginationItems = buildPaginationItems(page, totalPages);
  const firstRecordIndex = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecordIndex = Math.min(page * pageSize, totalRecords);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setSourceLang(ALL_LANGUAGES);
    setTargetLang(ALL_LANGUAGES);
    setPage(1);
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

  const downloadTranslation = async (
    itemId: string,
    translatedText: string,
    mode: TranslationHistoryMode,
    format: TranslateExportFormat,
  ) => {
    const text = translatedText.trim();
    if (!text || exportingRecord) return;

    setExportingRecord({ id: itemId, format });

    try {
      const filename = `ban-dich-${itemId.slice(0, 8)}`;
      const blob = await translateApi.exportTranslation({
        text,
        format,
        filename,
        title: getExportTitle(mode),
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${filename}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Đã tải ${format.toUpperCase()}.`);
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setExportingRecord(null);
    }
  };

  return (
    <PageLayout
      title="Thống kê bản dịch"
      description="Theo dõi số lượt dịch và dữ liệu nguồn/dữ liệu dịch trong hệ thống"
      onRefresh={async () => {
        await historyQuery.refetch();
      }}
      titleClassName="font-playfair text-[34px] leading-[1.1] font-bold tracking-tight text-[#4b1d18] md:text-[42px]"
    >
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

      <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-end">
        <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Từ ngày</p>
            <DatePicker
              value={fromDate}
              onChange={(value) => {
                setFromDate(value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Đến ngày
            </p>
            <DatePicker
              value={toDate}
              onChange={(value) => {
                setToDate(value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Ngôn ngữ nguồn
            </p>
            <Select
              value={sourceLang}
              onValueChange={(value) => {
                setSourceLang(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_LANGUAGES}>Tất cả</SelectItem>
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
            <Select
              value={targetLang}
              onValueChange={(value) => {
                setTargetLang(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_LANGUAGES}>Tất cả</SelectItem>
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
              onValueChange={(value) => {
                setPageSize(Number(value) as 10 | 25 | 50);
                setPage(1);
              }}
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
              onClick={resetFilters}
            >
              Xóa bộ lọc
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-white shadow-sm">
        {historyQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-slate-400" />
          </div>
        ) : historyQuery.isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
            <SearchX className="size-10 text-red-400" />
            <p className="text-sm font-medium text-red-600">
              Không thể tải dữ liệu dịch.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
            <SearchX className="size-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">
              Chưa có bản dịch phù hợp.
            </p>
          </div>
        ) : (
          <Table className="min-w-215 table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-slate-50">
              <TableRow>
                <TableHead className="w-37.5">Thời gian</TableHead>
                <TableHead className="w-35">Người dịch</TableHead>
                <TableHead className="w-22.5">Luồng</TableHead>
                <TableHead className="w-40">Ngôn ngữ</TableHead>
                <TableHead className="w-50 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedRecord(item)}
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
                  <TableCell className="align-top text-sm">
                    <span className="block truncate">
                      {getLanguageLabel(item.source_lang)} {"->"}{" "}
                      {getLanguageLabel(item.target_lang)}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex justify-end gap-2">
                      {(["docx", "pdf"] as const).map((format) => {
                        const isExporting =
                          exportingRecord?.id === item.id &&
                          exportingRecord.format === format;

                        return (
                          <Button
                            key={format}
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={Boolean(exportingRecord)}
                            onClick={(event) => {
                              event.stopPropagation();
                              void downloadTranslation(
                                item.id,
                                item.translated_text,
                                item.mode,
                                format,
                              );
                            }}
                          >
                            {isExporting ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Download className="size-4" />
                            )}
                            {format.toUpperCase()}
                          </Button>
                        );
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          Hiển thị {firstRecordIndex}-{lastRecordIndex} / {totalRecords} bản
          dịch
        </p>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                disabled={!canGoPrevious}
                onClick={(event) => {
                  event.preventDefault();
                  if (!canGoPrevious) return;
                  setPage((current) => Math.max(1, current - 1));
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
                      setPage(item);
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
                  setPage((current) => Math.min(totalPages, current + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <Dialog
        open={Boolean(selectedRecord)}
        onOpenChange={(open) => {
          if (!open) setSelectedRecord(null);
        }}
      >
        <DialogContent className="max-w-7xl">
          <DialogHeader>
            <DialogTitle>Chi tiết bản dịch</DialogTitle>
          </DialogHeader>
          {selectedRecord ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="overflow-hidden rounded-md border bg-white">
                <div className="flex min-h-12 items-center justify-between gap-3 border-b px-4 py-2">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Văn bản gốc
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void copyText(
                        selectedRecord.source_text,
                        "Đã sao chép văn bản gốc.",
                      )
                    }
                  >
                    <Copy className="size-4" />
                    Sao chép
                  </Button>
                </div>
                <pre className="max-h-[55vh] min-h-72 overflow-auto whitespace-pre-wrap bg-slate-50 p-4 text-sm text-slate-700">
                  {selectedRecord.source_text}
                </pre>
              </div>
              <div className="overflow-hidden rounded-md border bg-white">
                <div className="flex min-h-12 items-center justify-between gap-3 border-b px-4 py-2">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Bản dịch
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void copyText(
                        selectedRecord.translated_text,
                        "Đã sao chép bản dịch.",
                      )
                    }
                  >
                    <Copy className="size-4" />
                    Sao chép
                  </Button>
                </div>
                <pre className="max-h-[55vh] min-h-72 overflow-auto whitespace-pre-wrap bg-slate-50 p-4 text-sm text-slate-700">
                  {selectedRecord.translated_text}
                </pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
