import { z } from "zod";

import { DEFAULT_OPERATOR_PERMISSIONS } from "@/lib/auth";
import { APP_PERMISSIONS, USER_ROLES, USER_STATUSES } from "@/types/auth.types";
import type { AppPermission } from "@/types/auth.types";
import type {
  AdminAccount,
  AdminAccountUpsertPayload,
} from "@/feature/admin-accounts/types/admin-accounts.types";

const optionalTextSchema = z.string().max(255, "Giá trị quá dài");

const baseAdminAccountFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
  username: optionalTextSchema,
  password: z.string(),
  role: z.enum(USER_ROLES),
  status: z.enum(USER_STATUSES),
  permissions: z.array(z.enum(APP_PERMISSIONS)),
});

export const createAdminAccountFormSchema = baseAdminAccountFormSchema.extend({
  password: z.string().trim().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export const updateAdminAccountFormSchema = baseAdminAccountFormSchema.extend({
  password: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || value.length >= 6,
      "Mật khẩu phải có ít nhất 6 ký tự",
    ),
});

export type CreateAdminAccountFormValues = z.infer<
  typeof createAdminAccountFormSchema
>;
export type UpdateAdminAccountFormValues = z.infer<
  typeof updateAdminAccountFormSchema
>;
export type AdminAccountFormValues =
  | CreateAdminAccountFormValues
  | UpdateAdminAccountFormValues;

export function getAdminAccountFormDefaults(
  account?: AdminAccount | null,
): UpdateAdminAccountFormValues {
  return {
    email: account?.email ?? "",
    username: account?.username ?? "",
    password: "",
    role: account?.role ?? "OPERATOR",
    status: account?.status ?? "ACTIVE",
    permissions: account?.permissions ?? [...DEFAULT_OPERATOR_PERMISSIONS],
  };
}

export function togglePermissionSelection(
  permissions: AppPermission[],
  permission: AppPermission,
) {
  if (permissions.includes(permission)) {
    return permissions.filter((item) => item !== permission);
  }

  return [...permissions, permission];
}

export function toAdminAccountPayload(
  values: AdminAccountFormValues,
): AdminAccountUpsertPayload {
  const username = values.username.trim();
  const password = values.password.trim();

  return {
    email: values.email.trim(),
    username: username || undefined,
    password: password || undefined,
    role: values.role,
    status: values.status,
    permissions: values.role === "ADMIN" ? undefined : [...values.permissions],
  };
}
