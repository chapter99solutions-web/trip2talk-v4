/** Ops session role (sessionStorage `trip2talk_role`). */
export type SessionRole = 'staff' | 'cohost' | 'owner' | 'platform';

export const SESSION_ROLE_KEY = 'trip2talk_role';

export const VALID_SESSION_ROLES: readonly SessionRole[] = [
  'staff',
  'cohost',
  'owner',
  'platform',
] as const;

export const PIN_ROLE_MAP: Record<string, SessionRole> = {
  '1111': 'staff',
  '4444': 'cohost',
  '9999': 'owner',
  '3501': 'platform',
};

export const ROLE_DASHBOARD_PATH: Record<SessionRole, string> = {
  staff: '/dashboard/staff',
  cohost: '/dashboard/cohost',
  owner: '/dashboard/owner',
  platform: '/dashboard/platform',
};

export function isSessionRole(value: string | null | undefined): value is SessionRole {
  return value != null && (VALID_SESSION_ROLES as readonly string[]).includes(value);
}

export function getStoredRole(): SessionRole | null {
  const raw = sessionStorage.getItem(SESSION_ROLE_KEY);
  return isSessionRole(raw) ? raw : null;
}

export function setStoredRole(role: SessionRole): void {
  sessionStorage.setItem(SESSION_ROLE_KEY, role);
}

export function clearStoredRole(): void {
  sessionStorage.removeItem(SESSION_ROLE_KEY);
}
