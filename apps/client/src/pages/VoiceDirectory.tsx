import { useDebounce } from "@/hooks/useDebounce";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  ChevronRight,
  IdCard,
  Loader2,
  Phone,
  Search,
  UserRound,
} from "lucide-react";
import { useState } from "react";

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
import { voiceDirectoryApi } from "@/feature/voice-directory/api/voice-directory.api";
import { VoiceDirectoryDetailSheet } from "@/feature/voice-directory/components/VoiceDirectoryDetailSheet";

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

const SORT_OPTIONS = [
  { value: "name:asc", label: "Sắp xếp theo tên (A - Z)" },
  { value: "name:desc", label: "Sắp xếp theo tên (Z - A)" },
  { value: "enrolled_at:desc", label: "Sắp xếp theo ngày mới nhất" },
  { value: "enrolled_at:asc", label: "Sắp xếp theo ngày cũ nhất" },
] as const;

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

export default function VoiceDirectory() {
  const [searchInput, setSearchInput] = useState("");
  // Always call useDebounce, then select value for query
  const debounced = useDebounce(searchInput.trim(), 500);
  const querySearch =
    searchInput.trim().length > 0 ? searchInput.trim() : debounced;
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"name" | "enrolled_at">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.voice.directory.list({
      search: querySearch,
      page,
      sortBy,
      sortOrder,
    }),
    queryFn: () =>
      voiceDirectoryApi.listVoices({
        page,
        page_size: 30,
        search: querySearch || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;
  const totalPages = pagination?.total_pages ?? 1;
  const sortValue = `${sortBy}:${sortOrder}` as const;
  const paginationItems = buildPaginationItems(page, totalPages);

  const openDetail = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) setSelectedId(null);
  };

  return (
    <PageLayout
      title="Hồ sơ giọng nói"
      description="Danh sách những người đã được định danh bằng giọng nói"
      onRefresh={async () => {
        await refetch();
      }}
      titleClassName="font-playfair text-[34px] leading-[1.1] font-bold tracking-tight text-[#4b1d18] md:text-[42px]"
    >
      <div className="flex items-center gap-10">
        <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm md:flex-row md:items-center flex-1">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Search className="size-4 shrink-0 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên, CCCD, SĐT…"
              className="h-auto border-none p-0 text-sm shadow-none focus-visible:ring-0"
              aria-label="Tìm kiếm danh bạ"
            />
            {isFetching && (
              <Loader2 className="size-4 animate-spin text-slate-400" />
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={sortValue}
            onValueChange={(value) => {
              const [nextSortBy, nextSortOrder] = value.split(":") as [
                "name" | "enrolled_at",
                "asc" | "desc",
              ];
              setSortBy(nextSortBy);
              setSortOrder(nextSortOrder);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-62.5 bg-white">
              <SelectValue placeholder="Sắp xếp danh sách" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {total > 0 && !isLoading && (
            <span className="shrink-0 text-xs font-medium text-slate-400">
              {total} liên hệ
            </span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm no-scrollbar relative">
        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60">
            <Loader2 className="size-8 animate-spin text-slate-400" />
          </div>
        )}
        {!isLoading && isError ? (
          <div className="flex h-full min-h-48 items-center justify-center p-8">
            <p className="text-center text-sm text-destructive">
              Không tải được danh sách. Kiểm tra kết nối hoặc đăng nhập lại.
            </p>
          </div>
        ) : !isLoading && items.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-center">
            <UserRound className="size-10 text-slate-300" />
            <p className="text-sm text-muted-foreground">
              {querySearch ? "Không có hồ sơ phù hợp." : "Chưa có hồ sơ nào."}
            </p>
            {querySearch && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setPage(1);
                }}
              >
                Xóa tìm kiếm
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-75 pl-6">Họ và tên</TableHead>
                <TableHead>SĐT</TableHead>
                <TableHead>CCCD</TableHead>
                <TableHead>Công việc</TableHead>
                <TableHead>Ngày định danh</TableHead>
                <TableHead className="text-right pr-6">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => {
                const avatarColor = getAvatarColor(row.name);
                const initial = row.name.trim()[0]?.toUpperCase() ?? "?";

                return (
                  <TableRow
                    key={row.id}
                    className="group cursor-pointer hover:bg-slate-50/80"
                    onClick={() => openDetail(row.id)}
                  >
                    {/* Name + Avatar */}
                    <TableCell className="pl-6 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor}`}
                        >
                          {initial}
                        </div>
                        <span className="font-semibold text-slate-800 text-sm">
                          {row.name}
                        </span>
                      </div>
                    </TableCell>

                    {/* SĐT */}
                    <TableCell>
                      {row.phone_number ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          <Phone className="size-3 text-green-500" />
                          {row.phone_number}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Chưa có SĐT
                        </span>
                      )}
                    </TableCell>

                    {/* CCCD */}
                    <TableCell>
                      {row.citizen_identification ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          <IdCard className="size-3 text-blue-500" />
                          {row.citizen_identification}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Chưa có CCCD
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.job ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          <Briefcase className="size-3 text-blue-500" />
                          {row.job}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Chưa có công việc
                        </span>
                      )}
                    </TableCell>

                    {/* Ngày định danh */}
                    <TableCell>
                      {row.enrolled_at ? (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          ✓{" "}
                          {new Date(row.enrolled_at).toLocaleDateString(
                            "vi-VN",
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right pr-6">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-400"
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

      {!isLoading && !isError && total > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {pagination?.page ?? 1} / {totalPages}
          </p>
          <Pagination className="mx-0 w-auto justify-start md:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  type="button"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={page <= 1 || isFetching}
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
                      disabled={isFetching}
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
                  disabled={page >= totalPages || isFetching}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <VoiceDirectoryDetailSheet
        voiceId={selectedId}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        onDeactivated={() => {
          setSelectedId(null);
        }}
      />
    </PageLayout>
  );
}
