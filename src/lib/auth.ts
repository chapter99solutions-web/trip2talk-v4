import { supabase } from './supabase';
import { AppRole, PIN_ROLE_MAP } from '../types/platform';

const TENANT_SLUG = 'trip2talk';

/** Local PIN map (offline / demo). Prefer verifyPinRemote when online. */
export function verifyPinLocal(pin: string): AppRole | null {
  return PIN_ROLE_MAP[pin] ?? null;
}

/** Server PIN check via Supabase RPC `verify_pin` (00-schema-auth.sql). */
export async function verifyPinRemote(pin: string): Promise<{
  role: AppRole;
  displayName: string;
} | null> {
  const { data, error } = await supabase.rpc('verify_pin', {
    p_tenant_slug: TENANT_SLUG,
    p_pin: pin,
  });

  if (error) {
    console.warn('[Trip2Talk] verify_pin RPC failed, using local map:', error.message);
    const role = verifyPinLocal(pin);
    return role ? { role, displayName: role } : null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.role) return null;

  return {
    role: row.role as AppRole,
    displayName: row.display_name ?? row.role,
  };
}
