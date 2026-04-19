import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2, Plus, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { PageLayout } from "@/components/PageLayout";
import { Badge } from "@/components/ui/badge";
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
import { useDebounce } from "@/hooks/useDebounce";
import { getPermissionLabel, getRoleLabel, getStatusLabel } from "@/lib/auth";
import { useAuthStore } from "@/store/auth.store";

import { adminAccountsApi } from "@/feature/admin-accounts/api/admin-accounts.api";
import { AdminAccountDetailSheet } from "@/feature/admin-accounts/components/AdminAccountDetailSheet";
import { AdminAccountFormDialog } from "@/feature/admin-accounts/components/AdminAccountFormDialog";
import type {
  AdminAccount,
  AdminAccountSortBy,
  SortOrder,
} from "@/feature/admin-accounts/types/admin-accounts.types";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const SORT_OPTIONS = [
  { value: "email:asc", label: "Email (A - Z)" },
  { value: "email:desc", label: "Email (Z - A)" },
  { value: "username:asc", label: "Username (A - Z)" },
  { value: "username:desc", label: "Username (Z - A)" },
  { value: "role:asc", label: "Vai trò (A - Z)" },
  { value: "role:desc", label: "Vai trò (Z - A)" },
  { value: "status:asc", label: "Trạng thái (A - Z)" },
  { value: "status:desc", label: "Trạng thái (Z - A)" },
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

function PermissionSummary({ account }: { account: AdminAccount }) {
  if (account.role === "ADMIN") {
    return (
      <div className="space-y-1">
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
          Toàn quyền hệ thống
        </Badge>
        <p className="text-xs text-muted-foreground">
          {account.permissions.length} quyền được backend resolve
        </p>
      </div>
    );
  }

  return (
    <div className="flex max-w-xl flex-wrap gap-1.5">
      {account.permissions.map((permission) => (
        <Badge
          key={permission}
          variant="outline"
          className="h-auto rounded-xl px-2 py-1 text-[11px]"
        >
          {getPermissionLabel(permission)}
        </Badge>
      ))}
    </div>
  );
}

export default function AdminAccountManagement() {
  const currentUser = useAuthStore((state) => state.user);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [roleFilter, setRoleFilter] = useState<"all" | "ADMIN" | "OPERATOR">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "ACTIVE" | "INACTIVE"
  >("all");
  const [sortBy, setSortBy] = useState<AdminAccountSortBy>("email");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "update">("create");
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(
    null,
  );

  const querySearch = useDebounce(searchInput.trim(), 400);
  const sortValue = `${sortBy}:${sortOrder}` as const;

  const accountsQuery = useQuery({
    queryKey: QUERY_KEYS.admin.accounts.list({
      search: querySearch,
      page,
      pageSize,
      role: roleFilter,
      status: statusFilter,
      sortBy,
      sortOrder,
    }),
    queryFn: () =>
      adminAccountsApi.listAccounts({
        page,
        page_size: pageSize,
        search: querySearch || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  });

  const items = accountsQuery.data?.items ?? [];
  const pagination = accountsQuery.data?.pagination;
  const total = pagination?.total ?? 0;
  const totalPages = pagination?.total_pages ?? 1;
  const paginationItems = buildPaginationItems(page, totalPages);

  const openCreateDialog = () => {
    setFormMode("create");
    setEditingAccount(null);
    setFormOpen(true);
  };

  const openEditDialog = (account: AdminAccount) => {
    setFormMode("update");
    setEditingAccount(account);
    setFormOpen(true);
  };

  const openDetail = (accountId: string) => {
    setSelectedAccountId(accountId);
    setDetailOpen(true);
  };

  const handleFormSuccess = (account: AdminAccount) => {
    setEditingAccount(account);
    setSelectedAccountId(account.id);

    if (formMode === "create") {
      setDetailOpen(true);
    }
  };

  return (
    <PageLayout
      title="Quản lý tài khoản đăng nhập"
      description="Khu vực dành riêng cho ADMIN để quản lý tài khoản đăng nhập của hệ thống."
      onRefresh={async () => {
        await accountsQuery.refetch();
      }}
      titleClassName="font-playfair text-[34px] leading-[1.1] font-bold tracking-tight text-[#4b1d18] md:text-[42px]"
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="md:col-span-2 xl:col-span-2">
              <div className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                <Search className="size-4 shrink-0 text-slate-400" />
                <Input
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm theo email hoặc username"
                  className="h-auto border-none p-0 shadow-none focus-visible:ring-0"
                />
                {accountsQuery.isFetching ? (
                  <Loader2 className="size-4 animate-spin text-slate-400" />
                ) : null}
              </div>
            </div>

            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value as "all" | "ADMIN" | "OPERATOR");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Lọc theo vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả vai trò</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="OPERATOR">Operator</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as "all" | "ACTIVE" | "INACTIVE");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Lọc theo trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                <SelectItem value="INACTIVE">Đã vô hiệu hóa</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortValue}
              onValueChange={(value) => {
                const [nextSortBy, nextSortOrder] = value.split(":") as [
                  AdminAccountSortBy,
                  SortOrder,
                ];
                setSortBy(nextSortBy);
                setSortOrder(nextSortOrder);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full bg-white">
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
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(
                  Number(value) as (typeof PAGE_SIZE_OPTIONS)[number],
                );
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32 bg-white">
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

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchInput("");
                setRoleFilter("all");
                setStatusFilter("all");
                setSortBy("email");
                setSortOrder("asc");
                setPage(1);
                setPageSize(10);
              }}
            >
              Xóa bộ lọc
            </Button>

            <Button type="button" onClick={openCreateDialog}>
              <Plus className="size-4" />
              Tạo account
            </Button>
          </div>
        </div>

        {total > 0 ? (
          <p className="text-sm text-muted-foreground">
            {total} tài khoản trong hệ thống
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {accountsQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-slate-400" />
          </div>
        ) : accountsQuery.isError ? (
          <div className="flex min-h-64 items-center justify-center px-6">
            <p className="text-center text-sm text-destructive">
              Không tải được danh sách tài khoản. Kiểm tra quyền admin hoặc đăng
              nhập lại.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShieldCheck className="size-10 text-slate-300" />
            <p className="text-sm text-muted-foreground">
              {querySearch || roleFilter !== "all" || statusFilter !== "all"
                ? "Không có tài khoản nào khớp với bộ lọc hiện tại."
                : "Chưa có tài khoản nào trong hệ thống."}
            </p>
            {querySearch || roleFilter !== "all" || statusFilter !== "all" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchInput("");
                  setRoleFilter("all");
                  setStatusFilter("all");
                  setPage(1);
                }}
              >
                Xóa tìm kiếm
              </Button>
            ) : null}
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="pr-6 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((account) => {
                const isSelf = currentUser?.id === account.id;

                return (
                  <TableRow
                    key={account.id}
                    className="cursor-pointer hover:bg-slate-50/80"
                    onClick={() => openDetail(account.id)}
                  >
                    <TableCell className="pl-6">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800">
                          {account.email}
                        </p>
                        {isSelf ? (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-amber-700"
                          >
                            Tài khoản của bạn
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-700">
                        {account.username || "Chưa đặt username"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-primary-100 text-primary-700 hover:bg-primary-100">
                        {getRoleLabel(account.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          account.status === "ACTIVE"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-300 bg-slate-100 text-slate-700"
                        }
                      >
                        {getStatusLabel(account.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <PermissionSummary account={account} />
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:bg-primary-50 hover:text-primary-400"
                        aria-label="Xem chi tiết tài khoản"
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

      {!accountsQuery.isLoading && !accountsQuery.isError && total > 0 ? (
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
                  disabled={page <= 1 || accountsQuery.isFetching}
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
                      disabled={accountsQuery.isFetching}
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
                  disabled={page >= totalPages || accountsQuery.isFetching}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}

      <AdminAccountDetailSheet
        accountId={selectedAccountId}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedAccountId(null);
          }
        }}
        onEdit={openEditDialog}
      />

      <AdminAccountFormDialog
        key={`${formMode}-${editingAccount?.id ?? "new"}`}
        mode={formMode}
        open={formOpen}
        account={editingAccount}
        isSelf={currentUser?.id === editingAccount?.id}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
      />
    </PageLayout>
  );
}
