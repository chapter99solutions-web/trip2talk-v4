-- Trip2Talk V4 — Owner Dashboard "Add / Edit Trip" support
--
-- WHY THIS FILE EXISTS
-- The Owner Dashboard (/dashboard/owner) writes to the `tours` table with the
-- PUBLIC anon key (no Supabase Auth session; PIN auth is client-side). Two gaps
-- block that flow against the canonical V4 schema (00..12):
--
--   1. MISSING COLUMNS — the Add/Edit Trip form captures Duration, Private price,
--      Description and Cover image URL. `tours` (01-schema + 11-schema) has no
--      column for those, so the INSERT/UPDATE would fail with
--      "Could not find the 'X' column of 'tours' in the schema cache".
--
--   2. ANON WRITES — 12-schema-rls.sql does NOT grant anon INSERT/UPDATE on
--      `tours`. If RLS is (or gets) enabled on `tours`, the dashboard write fails
--      with a row-level-security violation. The policies below grant exactly the
--      SELECT/INSERT/UPDATE the dashboard performs, and nothing else.
--
-- APPLY MANUALLY (project convention — do NOT run `db push`):
--   Supabase Dashboard -> SQL Editor -> paste this whole file -> Run.
--
-- Re-runnable: every statement is idempotent (IF NOT EXISTS / DROP POLICY IF
-- EXISTS before CREATE POLICY). Service-role Edge Functions bypass RLS and are
-- unaffected.

-- ============================================================================
-- 1. Additive columns for the Add/Edit Trip form (nullable, no data migration).
-- ============================================================================
ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS duration_text     TEXT,
  ADD COLUMN IF NOT EXISTS private_price_aud NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS description       TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url   TEXT;

-- ============================================================================
-- 2. Anon write access for the Owner Dashboard.
--    Enabling RLS is idempotent. The permissive SELECT keeps existing anon
--    reads (owner/staff/cashier dashboards SELECT tours.*) working once RLS is
--    on; INSERT + UPDATE enable Add Trip / Edit Trip / status toggle.
-- ============================================================================
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_select_tours ON tours;
CREATE POLICY anon_select_tours ON tours
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_insert_tours ON tours;
CREATE POLICY anon_insert_tours ON tours
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS anon_update_tours ON tours;
CREATE POLICY anon_update_tours ON tours
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
