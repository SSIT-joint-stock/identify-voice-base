import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronRight,
  FileAudio,
  Loader2,
  SearchX,
} from "lucide-react";
import { useState } from "react";

// import { Badge } from '@/components/ui/badge';
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { sessionsApi } from "@/feature/sessions/api/sessions.api";
import { SessionDetailSheet } from "@/feature/sessions/components/SessionDetailSheet";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN");
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

function getScoreMeta(score: number | null) {
  if (score === null) {
    return {
      label: "Chưa có điểm",
      className: "border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  if (score >= 0.9) {
    return {
      label: score.toFixed(3),
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (score >= 0.7) {
    return {
      label: score.toFixed(3),
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: score.toFixed(3),
    className: "border-red-200 bg-red-50 text-red-700",
  };
}

export default function VoiceSessionHistory() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(10);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const sessionsQuery = useQuery({
    queryKey: QUERY_KEYS.voice.sessions.list({
      page,
      pageSize,
      fromDate,
      toDate,
    }),
    queryFn: () =>
      sessionsApi.listSessions({
        page,
        page_size: pageSize,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      }),
  });

  const items = sessionsQuery.data?.items ?? [];
  const pagination = sessionsQuery.data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;
  const paginationItems = buildPaginationItems(page, totalPages);

  const openDetail = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setDetailOpen(true);
  };

  return (
    <PageLayout
      title="Lịch sử định danh"
      description="Theo dõi các phiên nhận dạng, lọc theo thời gian và kiểm tra chi tiết từng phiên"
      onRefresh={async () => {
        await sessionsQuery.refetch();
      }}
      titleClassName="font-playfair text-[34px] leading-[1.1] font-bold tracking-tight text-[#4b1d18] md:text-[42px]"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-end">
        <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Từ ngày</p>
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Đến ngày
            </p>
            <Input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Số dòng mỗi trang
            </p>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value) as 10 | 25 | 50);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Chọn kích thước trang" />
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
              onClick={() => {
                setFromDate("");
                setToDate("");
                setPageSize(10);
                setPage(1);
              }}
            >
              Xóa bộ lọc
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {sessionsQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-slate-400" />
          </div>
        ) : sessionsQuery.isError ? (
          <div className="flex min-h-64 items-center justify-center px-6">
            <p className="text-center text-sm text-destructive">
              Không tải được danh sách phiên. Kiểm đăng nhập lại hoặc do bạn
              không có quyền hạn để truy cập vào dữ liệu lại.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <SearchX className="size-10 text-slate-300" />
            <p className="text-sm text-muted-foreground">
              Không có phiên nào khớp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Thời gian</TableHead>
                {/* <TableHead>Operator</TableHead> */}
                <TableHead>Số speaker</TableHead>
                <TableHead>Điểm cao nhất</TableHead>
                <TableHead>Audio</TableHead>
                <TableHead className="pr-6 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => {
                const scoreMeta = getScoreMeta(row.top_score);

                return (
                  <TableRow
                    key={row.id}
                    className="group cursor-pointer hover:bg-slate-50/80"
                    onClick={() => openDetail(row.id)}
                  >
                    <TableCell className="pl-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-800">
                          {formatDateTime(row.identified_at)}
                        </p>
                        {/* <p className="text-xs text-muted-foreground">{row.id.slice(0, 12)}...</p> */}
                      </div>
                    </TableCell>
                    {/* <TableCell>
                      <Badge variant="outline">{row.operator.username}</Badge>
                    </TableCell> */}
                    <TableCell>
                      <span className="text-sm font-medium">
                        {row.result_count}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${scoreMeta.className}`}
                      >
                        {scoreMeta.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.audio_url ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                          <FileAudio className="size-3.5" />
                          Có audio
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Không có
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-400 hover:bg-primary-50 hover:text-primary-400"
                        aria-label="Xem chi tiết"
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {!sessionsQuery.isLoading &&
      !sessionsQuery.isError &&
      (pagination?.total ?? 0) > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            <span>
              Trang {pagination?.page ?? 1} / {totalPages} -{" "}
              {pagination?.total ?? 0} phiên
            </span>
          </div>
          <Pagination className="mx-0 w-auto justify-start md:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  type="button"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={page <= 1 || sessionsQuery.isFetching}
                />
              </PaginationItem>
              {paginationItems.map((item, index) => (
                <PaginationItem key={`${item}-${index}`}>
                  {item === "ellipsis" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      type="button"
                      isActive={item === page}
                      onClick={() => setPage(item)}
                      disabled={sessionsQuery.isFetching}
                    >
                      {item}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(current + 1, totalPages))
                  }
                  disabled={page >= totalPages || sessionsQuery.isFetching}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}

      <SessionDetailSheet
        sessionId={selectedSessionId}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedSessionId(null);
          }
        }}
      />
    </PageLayout>
  );
}
