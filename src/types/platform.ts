/** App roles resolved after PIN entry (client-side gate; DB: pin_users.role). */
export type AppRole = 'STAFF' | 'COHOST' | 'OWNER' | 'PLATFORM_ADMIN';

export const PIN_ROLE_MAP: Record<string, AppRole> = {
  '1111': 'STAFF',
  '4444': 'COHOST',
  '9999': 'OWNER',
  '3501': 'PLATFORM_ADMIN',
};

export const PIN_LABELS: Record<AppRole, { en: string; th: string }> = {
  STAFF: { en: 'Staff', th: 'ทีมงาน' },
  COHOST: { en: 'Co-Host', th: 'Co-Host' },
  OWNER: { en: 'Owner (Saen)', th: 'เจ้าของ (พี่แสน)' },
  PLATFORM_ADMIN: { en: 'Platform Admin', th: 'แอดมินแพลตฟอร์ม' },
};

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  abn: string | null;
  created_at: string;
}

export interface PinUser {
  id: string;
  tenant_id: string;
  role: AppRole;
  display_name: string;
  is_active: boolean;
  last_login_at: string | null;
}
