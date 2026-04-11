import { Fragment, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QUERY_KEYS } from "@/constants";
import { voiceDirectoryApi } from "@/feature/voice-directory/api/voice-directory.api";
import { VoiceDirectoryDetailSheet } from "@/feature/voice-directory/components/VoiceDirectoryDetailSheet";
import {
  formatDirectorySectionLabel,
  getDirectoryAlphaSection,
} from "@/feature/voice-directory/utils/directory-alpha";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export default function VoiceDirectory() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      setDebouncedSearch((prev) => {
        if (prev === next) {
          return prev;
        }
        queueMicrotask(() => {
          setPage(1);
        });
        return next;
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const listQuery = useQuery({
    queryKey: QUERY_KEYS.voice.directory.list({
      page,
      pageSize,
      search: debouncedSearch,
    }),
    queryFn: () =>
      voiceDirectoryApi.listVoices({
        page,
        page_size: pageSize,
        search: debouncedSearch.trim() || undefined,
      }),
  });

  const items = listQuery.data?.items ?? [];
  const pagination = listQuery.data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;
  const total = pagination?.total ?? 0;

  const openDetail = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setSelectedId(null);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-playfair text-2xl font-bold text-[#4b1d18] md:text-3xl">
          Danh bạ định danh
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Danh sách của những người đã được định danh bằng giọng nói
        </p>
      </header>

      <div className="flex flex-col gap-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên, CCCD, SĐT…"
            className="pl-9"
            aria-label="Tìm kiếm danh bạ"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Số dòng / trang</span>
          <select
            className="rounded-md border border-input bg-background px-2 py-1.5 text-foreground"
            value={pageSize}
            onChange={(e) => {
              setPageSize(
                Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number],
              );
              setPage(1);
            }}
            aria-label="Kích thước trang"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        {listQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            Đang tải danh sách…
          </div>
        ) : listQuery.isError ? (
          <p className="p-8 text-center text-sm text-destructive">
            Không tải được danh sách. Kiểm tra kết nối hoặc đăng nhập lại.
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <p className="text-sm text-muted-foreground">
              Không có hồ sơ phù hợp.
            </p>
            {debouncedSearch ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setDebouncedSearch("");
                }}
              >
                Xóa bộ lọc tìm kiếm
              </Button>
            ) : null}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ tên</TableHead>
                <TableHead className="hidden md:table-cell">CCCD</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Điện thoại
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  Đăng ký giọng
                </TableHead>
                <TableHead className="w-30 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row, index) => {
                const section = getDirectoryAlphaSection(row.name);
                const prevSection =
                  index > 0
                    ? getDirectoryAlphaSection(items[index - 1]!.name)
                    : null;
                const showSectionHeader = section !== prevSection;

                return (
                  <Fragment key={row.id}>
                    {showSectionHeader ? (
                      <TableRow className="border-t-2 border-primary-200 bg-primary-50/60 hover:bg-primary-50/60">
                        <TableCell
                          colSpan={5}
                          className="py-2.5 text-sm font-semibold tracking-wide text-primary-700"
                        >
                          {formatDirectorySectionLabel(section)}
                        </TableCell>
                      </TableRow>
                    ) : null}
                    <TableRow>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {row.citizen_identification ?? "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {row.phone_number ?? "—"}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                        {row.enrolled_at
                          ? new Date(row.enrolled_at).toLocaleString("vi-VN")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openDetail(row.id)}
                        >
                          Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {pagination && items.length > 0 ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Tổng <span className="font-medium text-foreground">{total}</span> hồ
            sơ — trang {pagination.page} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
              Trước
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <VoiceDirectoryDetailSheet
        voiceId={selectedId}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        onDeactivated={() => {
          setSelectedId(null);
        }}
      />
    </div>
  );
}
