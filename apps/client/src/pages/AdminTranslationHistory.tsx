import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Copy,
  Download,
  Languages,
  Loader2,
  SearchX,
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
import { TranslationHistoryDatePicker } from "@/feature/translate/components/translation-history-date-picker";
import { TRANSLATION_LANGUAGES } from "@/feature/translate/constants/translate.constants";
import type {
  TranslationHistoryMode,
  TranslationHistoryRecord,
} from "@/feature/translate/types/translate.types";
import {
  buildPaginationItems,
  formatDateTime,
  getExportTitle,
  getFileTypeLabel,
  getLanguageLabel,
} from "@/feature/translate/utils/translation-history.utils";
import { formatError } from "@/utils";

const ALL_LANGUAGES = "all";

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
    setPageSize(10);
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
            <TranslationHistoryDatePicker
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
            <TranslationHistoryDatePicker
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
          <Table className="min-w-230 table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-slate-50">
              <TableRow>
                <TableHead className="w-37.5">Thời gian</TableHead>
                <TableHead className="w-35">Người dịch</TableHead>
                <TableHead className="w-22.5">Luồng</TableHead>
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
                    <Badge variant="secondary">
                      {getFileTypeLabel(item.source_file_type)}
                    </Badge>
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
                <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b px-4 py-2">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Bản dịch
                  </p>
                  <div className="flex flex-wrap justify-end gap-2">
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
                    {(["docx", "pdf"] as const).map((format) => {
                      const isExporting =
                        exportingRecord?.id === selectedRecord.id &&
                        exportingRecord.format === format;

                      return (
                        <Button
                          key={format}
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={Boolean(exportingRecord)}
                          onClick={() =>
                            void downloadTranslation(
                              selectedRecord.id,
                              selectedRecord.translated_text,
                              selectedRecord.mode,
                              format,
                            )
                          }
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
