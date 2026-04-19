import type { AppPermission, UserRole, UserStatus } from "@/types/auth.types";

export type AdminAccountSortBy = "email" | "username" | "role" | "status";
export type SortOrder = "asc" | "desc";

export interface AdminAccount {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  permissions: AppPermission[];
}

export interface AdminAccountPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AdminAccountListResponse {
  items: AdminAccount[];
  pagination: AdminAccountPagination;
}

export interface AdminAccountListParams {
  page: number;
  page_size: 10 | 20 | 50;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sort_by?: AdminAccountSortBy;
  sort_order?: SortOrder;
}

export interface AdminAccountUpsertPayload {
  email: string;
  username?: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  permissions?: AppPermission[];
}
