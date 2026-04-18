import { AudioPurpose, Role, type auth_accounts } from '@prisma/client';

export const ALL_PERMISSIONS = [
  'accounts.manage',
  'profile.read',
  'profile.update',
  'profile.delete',
  'voices.read',
  'voices.enroll',
  'voices.update',
  'voices.delete',
  'identify.run',
  'sessions.read',
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

  return [...ALL_PERMISSIONS];
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
      return 'voices.enroll';
    case AudioPurpose.IDENTIFY:
      return 'identify.run';
    case AudioPurpose.UPDATE_VOICE:
      return 'voices.update';
  }
}
