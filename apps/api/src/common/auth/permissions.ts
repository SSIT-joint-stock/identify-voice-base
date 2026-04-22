import { AudioPurpose, Role, type auth_accounts } from '@prisma/client';

export const ACCOUNTS = {
  MANAGE: 'accounts.manage',
} as const;

export const PROFILE = {
  READ: 'profile.read',
  UPDATE: 'profile.update',
  DELETE: 'profile.delete',
} as const;

export const VOICES = {
  READ: 'voices.read',
  ENROLL: 'voices.enroll',
  UPDATE: 'voices.update',
  DELETE: 'voices.delete',
} as const;

export const IDENTIFY = {
  RUN: 'identify.run',
} as const;

export const OCR = {
  RUN: 'ocr.run',
} as const;

export const S2T = {
  RUN: 's2t.run',
} as const;

export const TRANSLATE = {
  RUN: 'translate.run',
} as const;

export const SESSIONS = {
  READ: 'sessions.read',
} as const;

export const ALL_PERMISSIONS = [
  ACCOUNTS.MANAGE, // Quản lý tài khoản (tạo, cập nhật role/status/password/permissions)
  PROFILE.READ, // Đọc thông tin profile cá nhân
  PROFILE.UPDATE, // Cập nhật profile cá nhân
  PROFILE.DELETE, // Xóa tài khoản cá nhân
  VOICES.READ, // Xem danh sách và chi tiết voiceprints
  VOICES.ENROLL, // Đăng ký voiceprint mới
  VOICES.UPDATE, // Cập nhật voiceprint (ví dụ: enroll thêm mẫu giọng nói)
  VOICES.DELETE, // Xóa voiceprint
  IDENTIFY.RUN, // Chạy chức năng nhận diện giọng nói (identify)
  OCR.RUN, // Chạy OCR tài liệu qua AI Core
  S2T.RUN, // Chạy Speech-to-Text qua AI Core
  TRANSLATE.RUN, // Chạy dịch văn bản qua AI Core
  SESSIONS.READ, // Xem danh sách và chi tiết các phiên đăng nhập
] as const;

export type AppPermission = (typeof ALL_PERMISSIONS)[number];

const APP_PERMISSION_SET = new Set<string>(ALL_PERMISSIONS);

export function normalizePermissions(input: unknown): AppPermission[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const permissions = input.filter(
    (permission): permission is AppPermission =>
      typeof permission === 'string' && APP_PERMISSION_SET.has(permission),
  );

  return [...new Set(permissions)];
}

export function getDefaultPermissionsForRole(role: Role): AppPermission[] {
  if (role === Role.ADMIN) {
    return [...ALL_PERMISSIONS];
  }

  return [PROFILE.READ, VOICES.READ, VOICES.ENROLL];
}

export function resolveAccountPermissions(
  account: Pick<auth_accounts, 'role' | 'permissions'>,
): AppPermission[] {
  if (account.role === Role.ADMIN) {
    return getDefaultPermissionsForRole(Role.ADMIN);
  }

  const permissions = normalizePermissions(account.permissions);

  if (permissions.length > 0) {
    return permissions;
  }

  return getDefaultPermissionsForRole(Role.OPERATOR);
}

export function hasPermission(
  account: Pick<auth_accounts, 'role' | 'permissions'>,
  permission: AppPermission,
): boolean {
  if (account.role === Role.ADMIN) {
    return true;
  }

  return resolveAccountPermissions(account).includes(permission);
}

export function getPermissionForAudioPurpose(
  purpose: AudioPurpose,
): AppPermission {
  switch (purpose) {
    case AudioPurpose.ENROLL:
      return VOICES.ENROLL;
    case AudioPurpose.IDENTIFY:
      return IDENTIFY.RUN;
    case AudioPurpose.UPDATE_VOICE:
      return VOICES.UPDATE;
  }
}
