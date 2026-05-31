import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

/** True when real keys were present at build/dev time. */
export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!supabaseConfigured) {
  // อย่า throw ตอน import — จะทำให้ทั้งแอปเป็นจอดำ (body bg navy) โดยเฉพาะ local dev
  // ที่ยังไม่มี .env.local. แสดง error ใน console แทน; query จะ fail แต่ UI ยัง render ได้.
  console.error(
    '[Trip2Talk] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy .env.example → .env.local and restart dev server.',
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://niuibpznjvytprbrzvnn.supabase.co',
  supabaseKey || 'missing-anon-key',
);
