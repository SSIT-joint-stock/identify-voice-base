import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  IdCard,
  Loader2,
  Phone,
  Search,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QUERY_KEYS } from "@/constants";
import { voiceDirectoryApi } from "@/feature/voice-directory/api/voice-directory.api";
import { VoiceDirectoryDetailSheet } from "@/feature/voice-directory/components/VoiceDirectoryDetailSheet";
import {
  formatDirectorySectionLabel,
  getDirectoryAlphaSection,
} from "@/feature/voice-directory/utils/directory-alpha";

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

export default function VoiceDirectory() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: QUERY_KEYS.voice.directory.list({ search: debouncedSearch }),
    queryFn: ({ pageParam }) =>
      voiceDirectoryApi.listVoices({
        page: pageParam as number,
        page_size: 30,
        search: debouncedSearch || undefined,
      }),
    getNextPageParam: (lastPage) => {
      const { page, total_pages } = lastPage.pagination;
      return page < total_pages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.pagination.total ?? 0;

  const sentinelRef = useRef<HTMLLIElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const attachSentinel = useCallback(
    (node: HTMLLIElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      sentinelRef.current = node;
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (
            entries[0]?.isIntersecting &&
            hasNextPage &&
            !isFetchingNextPage
          ) {
            void fetchNextPage();
          }
        },
        { threshold: 0.1 },
      );
      observerRef.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  const openDetail = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) setSelectedId(null);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="font-playfair text-2xl font-bold text-[#4b1d18] md:text-3xl">
          Hồ sơ giọng nói
        </h1>
        <p className="text-sm text-muted-foreground">
          Danh sách những người đã được định danh bằng giọng nói
        </p>
      </header>

      {/* Search bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <Search className="size-4 shrink-0 text-slate-400" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Tìm theo tên, CCCD, SĐT…"
          className="h-auto border-none p-0 shadow-none focus-visible:ring-0 text-sm"
          aria-label="Tìm kiếm danh bạ"
        />
        {total > 0 && !isLoading && (
          <span className="shrink-0 text-xs text-slate-400 font-medium">
            {total} liên hệ
          </span>
        )}
      </div>

      {/* List container */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-full min-h-48 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Đang tải danh sách…</span>
          </div>
        ) : isError ? (
          <div className="flex h-full min-h-48 items-center justify-center p-8">
            <p className="text-center text-sm text-destructive">
              Không tải được danh sách. Kiểm tra kết nối hoặc đăng nhập lại.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-center">
            <UserRound className="size-10 text-slate-300" />
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? "Không có hồ sơ phù hợp."
                : "Chưa có hồ sơ nào."}
            </p>
            {debouncedSearch && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSearchInput("")}
              >
                Xóa tìm kiếm
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((row, index) => {
              const section = getDirectoryAlphaSection(row.name);
              const prevSection =
                index > 0
                  ? getDirectoryAlphaSection(items[index - 1]!.name)
                  : null;
              const showSectionHeader = section !== prevSection;
              const avatarColor = getAvatarColor(row.name);
              const initial = row.name.trim()[0]?.toUpperCase() ?? "?";

              return (
                <Fragment key={row.id}>
                  {showSectionHeader && (
                    <li
                      className="sticky top-0 z-10 flex items-center gap-3 bg-slate-50/95 backdrop-blur-sm px-4 py-1.5"
                      aria-hidden="true"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-200 text-xs font-bold text-slate-600">
                        {formatDirectorySectionLabel(section)}
                      </span>
                      <span className="h-px flex-1 bg-slate-200" />
                    </li>
                  )}

                  <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
                    {/* Avatar */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor}`}
                    >
                      {initial}
                    </div>

                    {/* Name + info chips */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800 text-sm mb-1.5">
                        {row.name}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {row.phone_number ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            <Phone className="size-3 text-green-500" />
                            {row.phone_number}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                            Chưa có SĐT
                          </span>
                        )}
                        {row.citizen_identification ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            <IdCard className="size-3 text-blue-500" />
                            {row.citizen_identification}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                            Chưa có CCCD
                          </span>
                        )}
                        {row.enrolled_at && (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            ✓{" "}
                            {new Date(row.enrolled_at).toLocaleDateString(
                              "vi-VN",
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1 text-slate-500 hover:text-slate-900"
                      onClick={() => openDetail(row.id)}
                    >
                      Chi tiết
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </li>
                </Fragment>
              );
            })}

            {/* Infinite scroll sentinel */}
            <li ref={attachSentinel} className="h-1" aria-hidden="true" />

            {isFetchingNextPage && (
              <li className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-xs">Đang tải thêm…</span>
              </li>
            )}
          </ul>
        )}
      </div>

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
