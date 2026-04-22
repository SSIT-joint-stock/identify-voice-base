import type {
  AppPermission,
  AuthUser,
  UserRole,
  UserStatus,
} from "@/types/auth.types";

export const DEFAULT_OPERATOR_PERMISSIONS: AppPermission[] = [
  "profile.read",
  "voices.read",
  "voices.enroll",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  OPERATOR: "Người vận hành",
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Đã vô hiệu hóa",
};

export const PERMISSION_LABELS: Record<AppPermission, string> = {
  "accounts.manage": "Quản lý tài khoản",
  "profile.read": "Xem tài khoản cá nhân",
  "profile.update": "Sửa tài khoản cá nhân",
  "profile.delete": "Xóa/vô hiệu hóa tài khoản cá nhân",
  "voices.read": "Xem hồ sơ giọng nói",
  "voices.enroll": "Đăng ký giọng nói",
  "voices.update": "Cập nhật hồ sơ giọng nói",
  "voices.delete": "Xóa hồ sơ giọng nói",
  "identify.run": "Chạy nhận dạng",
  "ocr.run": "Chạy OCR tài liệu",
  "s2t.run": "Chạy chuyển giọng nói thành văn bản",
  "translate.run": "Chạy dịch văn bản",
  "sessions.read": "Xem lịch sử phiên nhận dạng",
};

export function getPermissionLabel(permission: AppPermission) {
  return PERMISSION_LABELS[permission];
}

export function getRoleLabel(role: UserRole) {
  return ROLE_LABELS[role];
}

export function getStatusLabel(status: UserStatus) {
  return STATUS_LABELS[status];
}

export function isAdminUser(
  user: Pick<AuthUser, "role"> | null | undefined,
): boolean {
  return user?.role === "ADMIN";
}
