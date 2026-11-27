import type { FilePermissions, PermissionScope } from '../types';

export type ScopeKey = keyof FilePermissions;
export type BitKey = keyof PermissionScope;

export interface PermissionPreset {
  octal: string;
  label: string;
  description: string;
}

export const PERMISSION_PRESETS: PermissionPreset[] = [
  { octal: '755', label: 'Standard Exec', description: 'rwxr-xr-x' },
  { octal: '644', label: 'Standard File', description: 'rw-r--r--' },
  { octal: '700', label: 'Owner Only', description: 'rwx------' },
  { octal: '600', label: 'Private File', description: 'rw-------' },
  { octal: '444', label: 'Read Only', description: 'r--r--r--' },
];

export const OWNER_OPTIONS = ['anon', 'root', 'wheel', 'users'];

export function scopeToDigit(scope: PermissionScope): number {
  return (scope.read ? 4 : 0) + (scope.write ? 2 : 0) + (scope.exec ? 1 : 0);
}

export function digitToScope(digit: number): PermissionScope {
  const clamped = Math.max(0, Math.min(7, digit));
  return {
    read: (clamped & 4) !== 0,
    write: (clamped & 2) !== 0,
    exec: (clamped & 1) !== 0,
  };
}

export function permissionsToOctal(perms: FilePermissions): string {
  return `${scopeToDigit(perms.owner)}${scopeToDigit(perms.group)}${scopeToDigit(perms.other)}`;
}

export function octalToPermissions(octal: string): FilePermissions | null {
  const trimmed = octal.trim();
  if (!/^[0-7]{3}$/.test(trimmed)) {
    return null;
  }
  return {
    owner: digitToScope(Number(trimmed[0])),
    group: digitToScope(Number(trimmed[1])),
    other: digitToScope(Number(trimmed[2])),
  };
}

export function scopeToString(scope: PermissionScope): string {
  return `${scope.read ? 'r' : '-'}${scope.write ? 'w' : '-'}${scope.exec ? 'x' : '-'}`;
}

export function permissionsToSymbolic(perms: FilePermissions, isFolder: boolean): string {
  const prefix = isFolder ? 'd' : '-';
  return `${prefix}${scopeToString(perms.owner)}${scopeToString(perms.group)}${scopeToString(perms.other)}`;
}

export function togglePermissionBit(
  perms: FilePermissions,
  scope: ScopeKey,
  bit: BitKey
): FilePermissions {
  return {
    ...perms,
    [scope]: {
      ...perms[scope],
      [bit]: !perms[scope][bit],
    },
  };
}

export function arePermissionsEqual(a: FilePermissions, b: FilePermissions): boolean {
  return permissionsToOctal(a) === permissionsToOctal(b);
}
