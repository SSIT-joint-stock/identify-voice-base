import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QUERY_KEYS } from "@/constants";
import {
  DEFAULT_OPERATOR_PERMISSIONS,
  getPermissionLabel,
  getRoleLabel,
  getStatusLabel,
} from "@/lib/auth";
import type { ApiError } from "@/types";
import { APP_PERMISSIONS } from "@/types/auth.types";

import { adminAccountsApi } from "@/feature/admin-accounts/api/admin-accounts.api";
import {
  createAdminAccountFormSchema,
  getAdminAccountFormDefaults,
  toAdminAccountPayload,
  togglePermissionSelection,
  updateAdminAccountFormSchema,
  type UpdateAdminAccountFormValues,
} from "@/feature/admin-accounts/schemas/admin-account.schema";
import type { AdminAccount } from "@/feature/admin-accounts/types/admin-accounts.types";

interface AdminAccountFormDialogProps {
  mode: "create" | "update";
  open: boolean;
  account?: AdminAccount | null;
  isSelf?: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (account: AdminAccount) => void;
}

export function AdminAccountFormDialog({
  mode,
  open,
  account,
  isSelf = false,
  onOpenChange,
  onSuccess,
}: AdminAccountFormDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm<UpdateAdminAccountFormValues>({
    resolver: zodResolver(
      mode === "create"
        ? createAdminAccountFormSchema
        : updateAdminAccountFormSchema,
    ),
    defaultValues: getAdminAccountFormDefaults(account),
  });

  const role =
    useWatch({
      control: form.control,
      name: "role",
    }) ?? "OPERATOR";
  const permissions =
    useWatch({
      control: form.control,
      name: "permissions",
    }) ?? [];
  const status =
    useWatch({
      control: form.control,
      name: "status",
    }) ?? "ACTIVE";

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(getAdminAccountFormDefaults(account));
  }, [account, form, mode, open]);

  const mutation = useMutation({
    mutationFn: async (values: UpdateAdminAccountFormValues) => {
      const payload = toAdminAccountPayload(values);

      if (mode === "create") {
        return adminAccountsApi.createAccount(payload);
      }

      if (!account) {
        throw new Error("Thiếu thông tin tài khoản cần cập nhật.");
      }

      return adminAccountsApi.updateAccount(account.id, payload);
    },
    onSuccess: async (savedAccount) => {
      toast.success(
        mode === "create"
          ? "Tạo tài khoản thành công."
          : "Cập nhật tài khoản thành công.",
      );

      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.admin.accounts.base,
      });

      if (mode === "update" && account) {
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.admin.accounts.detail(account.id),
        });
      }

      onSuccess?.(savedAccount);
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as ApiError).message)
          : mode === "create"
            ? "Không thể tạo tài khoản."
            : "Không thể cập nhật tài khoản.";

      toast.error(message);
    },
  });

  const handleRoleChange = (nextRole: "ADMIN" | "OPERATOR") => {
    const currentRole = form.getValues("role");
    form.setValue("role", nextRole, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (nextRole === "OPERATOR" && currentRole === "ADMIN") {
      form.setValue(
        "permissions",
        account?.role === "OPERATOR"
          ? account.permissions
          : [...DEFAULT_OPERATOR_PERMISSIONS],
        { shouldDirty: true, shouldValidate: true },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tạo tài khoản mới" : "Cập nhật tài khoản"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Thiết lập email, vai trò, trạng thái và quyền cho tài khoản đăng nhập mới."
              : "Chỉnh sửa thông tin đăng nhập, vai trò, trạng thái và quyền hiện có."}
          </DialogDescription>
        </DialogHeader>

        {isSelf ? (
          <Alert>
            <ShieldCheck className="size-4" />
            <AlertTitle>Đây là tài khoản hiện tại của bạn</AlertTitle>
            <AlertDescription>
              Tác vụ cá nhân như đổi mật khẩu vẫn nằm ở menu hồ sơ. Màn này là
              khu vực quản trị tài khoản hệ thống.
            </AlertDescription>
          </Alert>
        ) : null}

        <form
          className="space-y-6"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account-email">Email</Label>
              <Input id="account-email" {...form.register("email")} />
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-username">Username</Label>
              <Input
                id="account-username"
                placeholder="Không bắt buộc"
                {...form.register("username")}
              />
              {form.formState.errors.username ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.username.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-password">
                {mode === "create" ? "Mật khẩu" : "Mật khẩu mới"}
              </Label>
              <Input
                id="account-password"
                type="password"
                placeholder={
                  mode === "create" ? "Nhập mật khẩu" : "Để trống nếu không đổi"
                }
                autoComplete={
                  mode === "create" ? "new-password" : "current-password"
                }
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Vai trò</Label>
              <Select
                value={role}
                onValueChange={(value) =>
                  handleRoleChange(value as "ADMIN" | "OPERATOR")
                }
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{getRoleLabel("ADMIN")}</SelectItem>
                  <SelectItem value="OPERATOR">
                    {getRoleLabel("OPERATOR")}
                  </SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.role ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.role.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  form.setValue("status", value as "ACTIVE" | "INACTIVE", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">
                    {getStatusLabel("ACTIVE")}
                  </SelectItem>
                  <SelectItem value="INACTIVE">
                    {getStatusLabel("INACTIVE")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {role === "ADMIN" ? (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
              <ShieldCheck className="size-4" />
              <AlertTitle>ADMIN luôn có toàn bộ quyền hệ thống</AlertTitle>
              <AlertDescription className="text-emerald-800">
                Không cần cấu hình permission chi tiết khi vai trò là ADMIN.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Permission của operator</Label>
                <p className="text-xs text-muted-foreground">
                  Bỏ chọn hết sẽ dùng bộ quyền mặc định:{" "}
                  {DEFAULT_OPERATOR_PERMISSIONS.map(getPermissionLabel).join(
                    ", ",
                  )}
                  .
                </p>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {APP_PERMISSIONS.map((permission) => {
                  const checked = permissions.includes(permission);

                  return (
                    <label
                      key={permission}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                        checked
                          ? "border-primary-300 bg-primary-50/70"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 rounded border-slate-300"
                        checked={checked}
                        onChange={() =>
                          form.setValue(
                            "permissions",
                            togglePermissionSelection(permissions, permission),
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            },
                          )
                        }
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {getPermissionLabel(permission)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {permission}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang lưu...
                </>
              ) : mode === "create" ? (
                "Tạo tài khoản"
              ) : (
                "Lưu cập nhật"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
