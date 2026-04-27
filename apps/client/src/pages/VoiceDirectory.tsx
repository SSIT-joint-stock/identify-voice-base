import { useDebounce } from "@/hooks/useDebounce";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, IdCard, Loader2, Phone, UserRound } from "lucide-react";
import { useState } from "react";

import { PageLayout } from "@/components/PageLayout";
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
import { VoiceDirectorySearchBar } from "@/feature/voice-directory/components/VoiceDirectorySearchBar";
import type { VoiceDirectorySearchField } from "@/feature/voice-directory/types/voice-directory.types";
import {
  GENDER_FILTER_OPTIONS,
  PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
  buildPaginationItems,
  getAvatarColor,
} from "./VoiceDirectory.constants";
import {
  AgePill,
  GenderPill,
  InfoTooltip,
  PassportPill,
} from "./VoiceDirectory.helpers";

export default function VoiceDirectory() {
  const [searchInput, setSearchInput] = useState("");
  const [selectedSearchField, setSelectedSearchField] =
    useState<VoiceDirectorySearchField | null>(null);
  const querySearch = useDebounce(searchInput.trim(), 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [selectedGender, setSelectedGender] =
    useState<(typeof GENDER_FILTER_OPTIONS)[number]["value"]>("all");
  const [sortBy, setSortBy] = useState<"name" | "enrolled_at">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.voice.directory.list({
      search: querySearch,
      searchField: selectedSearchField,
      gender: selectedGender,
      page,
      pageSize,
      sortBy,
      sortOrder,
    }),
    queryFn: () =>
      voiceDirectoryApi.listVoices({
        page,
        page_size: pageSize,
        search: querySearch || undefined,
        search_field: selectedSearchField || undefined,
        gender: selectedGender === "all" ? undefined : selectedGender,
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
  const hasActiveFilter = Boolean(querySearch) || selectedGender !== "all";

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
    <PageLayout
      title="Hồ sơ định danh"
      description="Danh sách những người đã được định danh bằng giọng nói"
      onRefresh={async () => {
        await refetch();
      }}
      titleClassName="font-playfair text-[34px] leading-[1.1] font-bold tracking-tight text-[#4b1d18] md:text-[42px]"
    >
      <div className="flex flex-wrap items-center gap-4 lg:flex-nowrap lg:gap-6">
        <VoiceDirectorySearchBar
          value={searchInput}
          selectedField={selectedSearchField}
          isFetching={isFetching}
          onValueChange={(nextValue) => {
            setSearchInput(nextValue);
            setPage(1);
          }}
          onSelectedFieldChange={setSelectedSearchField}
        />

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
          <Select
            value={selectedGender}
            onValueChange={(value) => {
              setSelectedGender(
                value as (typeof GENDER_FILTER_OPTIONS)[number]["value"],
              );
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40 shrink-0 bg-white">
              <SelectValue placeholder="Lọc giới tính" />
            </SelectTrigger>
            <SelectContent>
              {GENDER_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
            <SelectTrigger className="w-62.5 shrink-0 bg-white">
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

          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-31 shrink-0 bg-white">
              <SelectValue placeholder="10 dòng" />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} dòng
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {total > 0 && !isLoading ? (
            <span className="shrink-0 whitespace-nowrap pl-1 text-xs font-medium text-slate-400">
              {total} liên hệ
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm no-scrollbar">
        {isLoading ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60">
            <Loader2 className="size-8 animate-spin text-slate-400" />
          </div>
        ) : null}

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
              {hasActiveFilter
                ? "Không có hồ sơ phù hợp."
                : "Chưa có hồ sơ nào."}
            </p>
            {hasActiveFilter ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setSelectedSearchField(null);
                  setSelectedGender("all");
                  setPage(1);
                }}
              >
                Xóa tìm kiếm
              </Button>
            ) : null}
          </div>
        ) : (
          <Table className=" table-fixed">
            <TableHeader className="sticky top-0 z-20 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[20%] pl-6">Họ và tên</TableHead>
                <TableHead className="w-[9%]">Giới tính</TableHead>
                <TableHead className="w-[8%]">Độ tuổi</TableHead>
                <TableHead className="w-[14%]">CCCD</TableHead>
                <TableHead className="w-[15%]">Số điện thoại</TableHead>
                <TableHead className="w-[12%]">Hộ chiếu</TableHead>
                <TableHead className="w-[13%]">Ngày định danh</TableHead>
                <TableHead className="w-[9%] pr-6 text-center">
                  Thao tác
                </TableHead>
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
                    <TableCell className="py-3 pl-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor}`}
                        >
                          {initial}
                        </div>
                        <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
                          <InfoTooltip value={row.name}>
                            <span className="block truncate">{row.name}</span>
                          </InfoTooltip>
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <GenderPill gender={row.gender} />
                    </TableCell>

                    <TableCell>
                      <AgePill age={row.age} />
                    </TableCell>

                    <TableCell>
                      {row.citizen_identification ? (
                        <InfoTooltip value={row.citizen_identification}>
                          <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            <IdCard className="size-3 shrink-0 text-blue-500" />
                            <span className="truncate">
                              {row.citizen_identification}
                            </span>
                          </span>
                        </InfoTooltip>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Chưa có CCCD
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      {row.phone_number ? (
                        <InfoTooltip value={row.phone_number}>
                          <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            <Phone className="size-3 shrink-0 text-green-500" />
                            <span className="truncate">{row.phone_number}</span>
                          </span>
                        </InfoTooltip>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Chưa có SĐT
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <PassportPill value={row.passport} />
                    </TableCell>

                    <TableCell>
                      {row.enrolled_at ? (
                        <InfoTooltip
                          value={new Date(row.enrolled_at).toLocaleString(
                            "vi-VN",
                          )}
                        >
                          <span className="inline-flex max-w-full items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <span className="truncate">
                              ✓{" "}
                              {new Date(row.enrolled_at).toLocaleDateString(
                                "vi-VN",
                              )}
                            </span>
                          </span>
                        </InfoTooltip>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>

                    <TableCell className="pr-6 text-center">
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

      {!isLoading && !isError && total > 0 ? (
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
      ) : null}

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
