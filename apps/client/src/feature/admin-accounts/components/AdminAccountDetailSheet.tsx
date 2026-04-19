import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { QUERY_KEYS } from "@/constants";
import {
  getPermissionLabel,
  getRoleLabel,
  getStatusLabel,
  isAdminUser,
} from "@/lib/auth";
import { useAuthStore } from "@/store/auth.store";

import { adminAccountsApi } from "@/feature/admin-accounts/api/admin-accounts.api";
import type { AdminAccount } from "@/feature/admin-accounts/types/admin-accounts.types";

interface AdminAccountDetailSheetProps {
  accountId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (account: AdminAccount) => void;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

export function AdminAccountDetailSheet({
  accountId,
  open,
  onOpenChange,
  onEdit,
}: AdminAccountDetailSheetProps) {
  const currentUser = useAuthStore((state) => state.user);
  const detailQuery = useQuery({
    queryKey: accountId
      ? QUERY_KEYS.admin.accounts.detail(accountId)
      : ["admin", "accounts", "detail", "none"],
    queryFn: () => adminAccountsApi.getAccount(accountId!),
    enabled: Boolean(accountId && open),
  });

  const detail = detailQuery.data;
  const isSelf = currentUser?.id === detail?.id;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-xl md:max-w-3xl"
      >
        <SheetHeader className="shrink-0 border-b pb-4 text-left">
          <SheetTitle>
            {detail?.email ?? "Chi tiết tài khoản đăng nhập"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
          {detailQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Đang tải chi tiết...
            </div>
          ) : detailQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Không tải được tài khoản</AlertTitle>
              <AlertDescription>
                Thử đóng và mở lại bảng chi tiết.
              </AlertDescription>
            </Alert>
          ) : detail ? (
            <>
              {isSelf ? (
                <Alert>
                  <ShieldCheck className="size-4" />
                  <AlertTitle>Đây là tài khoản hiện tại của bạn</AlertTitle>
                  <AlertDescription>
                    Tác vụ cá nhân như đổi mật khẩu vẫn nằm trong menu hồ sơ.
                    Màn này dùng cho quản trị tài khoản hệ thống.
                  </AlertDescription>
                </Alert>
              ) : null}

              {isAdminUser(detail) ? (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                  <ShieldCheck className="size-4" />
                  <AlertTitle>ADMIN có toàn bộ quyền hệ thống</AlertTitle>
                  <AlertDescription className="text-emerald-800">
                    Backend sẽ tự resolve full permission cho tài khoản ADMIN.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary-100 text-primary-700 hover:bg-primary-100">
                  {getRoleLabel(detail.role)}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    detail.status === "ACTIVE"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-300 bg-slate-100 text-slate-700"
                  }
                >
                  {getStatusLabel(detail.status)}
                </Badge>
                {isSelf ? (
                  <Badge
                    variant="outline"
                    className="border-amber-200 bg-amber-50 text-amber-700"
                  >
                    Tài khoản của bạn
                  </Badge>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <InfoRow label="Email" value={detail.email} />
                <InfoRow
                  label="Username"
                  value={detail.username || "Chưa đặt username"}
                />
                <InfoRow label="Role" value={getRoleLabel(detail.role)} />
                <InfoRow
                  label="Trạng thái"
                  value={getStatusLabel(detail.status)}
                />
                <div className="md:col-span-2">
                  <InfoRow label="Account ID" value={detail.id} />
                </div>
              </div>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Permission đang có
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Hiển thị đúng permission backend đang trả về cho tài khoản
                      này.
                    </p>
                  </div>
                  <Button type="button" onClick={() => onEdit(detail)}>
                    Cập nhật tài khoản
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {detail.permissions.map((permission) => (
                    <Badge
                      key={permission}
                      variant="outline"
                      className="h-auto min-h-8 items-center rounded-xl px-3 py-1 text-left"
                    >
                      <span className="font-medium">
                        {getPermissionLabel(permission)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {permission}
                      </span>
                    </Badge>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa có dữ liệu tài khoản.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
