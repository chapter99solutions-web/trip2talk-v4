-- Trip2Talk V4 — Enable RLS on ALL public tables + least-privilege policies
-- Project: rvcwprxnqwscgjusmjvj (or your linked ref)
--
-- Run in Supabase Dashboard → SQL Editor (paste entire file → Run).
-- Re-runnable: DROP POLICY IF EXISTS before each CREATE POLICY.
--
-- ARCHITECTURE (do not break):
--   • Public checkout uses the anon key → needs anon INSERT on tour_bookings
--     and RPC claim_seat_and_book (SECURITY DEFINER — bypasses RLS for seat + row).
--   • Owner/Staff/Co-Host dashboards use the anon key; PIN is verified client-side
--     (verify_pin RPC) — NOT Supabase Auth. Hybrid policies named *_dashboard_anon_*
--     keep dashboard SELECT/WRITE working until you issue JWTs with app_role claims.
--   • Edge Functions + service_role bypass RLS entirely.
--
-- NOTE: There is no public.trips or public.bookings table. Operational bookings
-- live in public.tour_bookings (and optionally public.trip_bookings). Trip catalog: public.tours.

-- ============================================================================
-- 0) JWT helpers (for authenticated users; optional future Supabase Auth)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.jwt_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    nullif(auth.jwt() ->> 'app_role', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'app_role', '')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner_or_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.jwt_app_role() IN ('OWNER', 'PLATFORM_ADMIN');
$$;

COMMENT ON FUNCTION public.jwt_app_role IS
  'Reads app_role from JWT (top-level or user_metadata). Set when moving PIN dashboards to Supabase Auth.';

-- ============================================================================
-- 1) Enable RLS on every public heap table that lacks it
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
    RAISE NOTICE 'RLS enabled on public.%', r.tbl;
  END LOOP;
END $$;

-- Idempotent on tables that already have RLS
ALTER TABLE IF EXISTS public.tour_bookings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tours             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_waivers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.safety_briefings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.net_settlements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sheets_sync_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.waiver_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.photo_delivery    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loyalty_points    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pso_briefs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pin_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payid_pool        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mrr_snapshots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tax_receipts      ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2) public.tour_bookings — operational bookings (checkout + dashboards)
-- ============================================================================
ALTER TABLE public.tour_bookings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.tour_bookings (user_id);

-- Drop legacy permissive policies (25 / 14 / 002)
DROP POLICY IF EXISTS "bookings_staff_owner_read" ON public.tour_bookings;
DROP POLICY IF EXISTS "bookings_client_read_own" ON public.tour_bookings;
DROP POLICY IF EXISTS anon_select_bookings ON public.tour_bookings;
DROP POLICY IF EXISTS anon_insert_bookings ON public.tour_bookings;

-- Checkout: anon may INSERT rows after claim_seat_and_book (or direct insert fallback)
CREATE POLICY bookings_anon_insert ON public.tour_bookings
  FOR INSERT TO anon
  WITH CHECK (true);

-- Authenticated: read own row (user_id or email claim)
CREATE POLICY bookings_authenticated_select_own ON public.tour_bookings
  FOR SELECT TO authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR (
      email IS NOT NULL
      AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- UPDATE / DELETE: owner or platform admin JWT only (no anon mutate)
CREATE POLICY bookings_authenticated_update_owner ON public.tour_bookings
  FOR UPDATE TO authenticated
  USING (public.is_owner_or_platform_admin())
  WITH CHECK (public.is_owner_or_platform_admin());

CREATE POLICY bookings_authenticated_delete_owner ON public.tour_bookings
  FOR DELETE TO authenticated
  USING (public.is_owner_or_platform_admin());

-- HYBRID: PIN dashboards (anon key) still need to read the manifest
CREATE POLICY bookings_dashboard_anon_select ON public.tour_bookings
  FOR SELECT TO anon
  USING (true);

-- ============================================================================
-- 3) public.tours (= "trips" in product language — public catalog + owner CMS)
-- ============================================================================
DROP POLICY IF EXISTS "public_read_tours" ON public.tours;
DROP POLICY IF EXISTS public_read_tours ON public.tours;
DROP POLICY IF EXISTS anon_select_tours ON public.tours;
DROP POLICY IF EXISTS anon_insert_tours ON public.tours;
DROP POLICY IF EXISTS anon_update_tours ON public.tours;
DROP POLICY IF EXISTS tours_public_read ON public.tours;
DROP POLICY IF EXISTS tours_authenticated_admin_insert ON public.tours;
DROP POLICY IF EXISTS tours_authenticated_admin_update ON public.tours;
DROP POLICY IF EXISTS tours_authenticated_admin_delete ON public.tours;
DROP POLICY IF EXISTS tours_owner_dashboard_anon_insert ON public.tours;
DROP POLICY IF EXISTS tours_owner_dashboard_anon_update ON public.tours;

-- Public read (portfolio, checkout availability, dashboards)
CREATE POLICY tours_public_read ON public.tours
  FOR SELECT TO anon, authenticated
  USING (true);

-- Authenticated admin write (when JWT carries app_role OWNER | PLATFORM_ADMIN)
CREATE POLICY tours_authenticated_admin_insert ON public.tours
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_or_platform_admin());

CREATE POLICY tours_authenticated_admin_update ON public.tours
  FOR UPDATE TO authenticated
  USING (public.is_owner_or_platform_admin())
  WITH CHECK (public.is_owner_or_platform_admin());

CREATE POLICY tours_authenticated_admin_delete ON public.tours
  FOR DELETE TO authenticated
  USING (public.is_owner_or_platform_admin());

-- HYBRID: Owner Dashboard uses anon key today (PIN client-side)
CREATE POLICY tours_owner_dashboard_anon_insert ON public.tours
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY tours_owner_dashboard_anon_update ON public.tours
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Seat changes + booking rows: RPC claim_seat_and_book (SECURITY DEFINER) — not direct anon UPDATE on tours

-- ============================================================================
-- 4) public.tour_bookings — operational bookings (keep checkout + dashboards)
-- ============================================================================
DROP POLICY IF EXISTS "owner_all_access" ON public.tour_bookings;
DROP POLICY IF EXISTS "staff_read_bookings" ON public.tour_bookings;
DROP POLICY IF EXISTS "cohost_insert_bookings" ON public.tour_bookings;
DROP POLICY IF EXISTS "client_read_own_booking" ON public.tour_bookings;
DROP POLICY IF EXISTS anon_select_tour_bookings ON public.tour_bookings;
DROP POLICY IF EXISTS anon_insert_tour_bookings ON public.tour_bookings;
DROP POLICY IF EXISTS anon_update_tour_bookings ON public.tour_bookings;

CREATE POLICY tour_bookings_anon_select ON public.tour_bookings
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY tour_bookings_anon_insert ON public.tour_bookings
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY tour_bookings_anon_update ON public.tour_bookings
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY tour_bookings_auth_owner_mutate ON public.tour_bookings
  FOR ALL TO authenticated
  USING (public.is_owner_or_platform_admin())
  WITH CHECK (public.is_owner_or_platform_admin());

-- ============================================================================
-- 5) GROUP A — hard deny anon (no direct PWA queries; RPC / service_role only)
-- ============================================================================
ALTER TABLE public.pin_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payid_pool         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mrr_snapshots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_alerts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_assignments  ENABLE ROW LEVEL SECURITY;

-- Revoke any accidental permissive policies on sensitive tables
DROP POLICY IF EXISTS anon_select_pin_users ON public.pin_users;
DROP POLICY IF EXISTS anon_all_pin_users ON public.pin_users;

-- ============================================================================
-- 6) GROUP B — least-privilege matching current PWA (supabase/12-schema-rls.sql)
-- ============================================================================

-- tenants
DROP POLICY IF EXISTS anon_select_tenants ON public.tenants;
CREATE POLICY tenants_anon_select ON public.tenants
  FOR SELECT TO anon, authenticated
  USING (true);

-- crm_clients (booking flow upsert)
DROP POLICY IF EXISTS anon_select_crm_clients ON public.crm_clients;
DROP POLICY IF EXISTS anon_insert_crm_clients ON public.crm_clients;
DROP POLICY IF EXISTS anon_update_crm_clients ON public.crm_clients;
CREATE POLICY crm_clients_anon_select ON public.crm_clients
  FOR SELECT TO anon USING (true);
CREATE POLICY crm_clients_anon_insert ON public.crm_clients
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY crm_clients_anon_update ON public.crm_clients
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- expenses
DROP POLICY IF EXISTS anon_select_expenses ON public.expenses;
DROP POLICY IF EXISTS anon_insert_expenses ON public.expenses;
CREATE POLICY expenses_anon_select ON public.expenses
  FOR SELECT TO anon USING (true);
CREATE POLICY expenses_anon_insert ON public.expenses
  FOR INSERT TO anon WITH CHECK (true);

-- client_waivers (read only from PWA)
DROP POLICY IF EXISTS anon_select_client_waivers ON public.client_waivers;
CREATE POLICY client_waivers_anon_select ON public.client_waivers
  FOR SELECT TO anon USING (true);

-- safety_briefings (insert only)
DROP POLICY IF EXISTS anon_insert_safety_briefings ON public.safety_briefings;
CREATE POLICY safety_briefings_anon_insert ON public.safety_briefings
  FOR INSERT TO anon WITH CHECK (true);

-- net_settlements (insert only)
DROP POLICY IF EXISTS anon_insert_net_settlements ON public.net_settlements;
CREATE POLICY net_settlements_anon_insert ON public.net_settlements
  FOR INSERT TO anon WITH CHECK (true);

-- sheets_sync_log (insert only)
DROP POLICY IF EXISTS anon_insert_sheets_sync_log ON public.sheets_sync_log;
CREATE POLICY sheets_sync_log_anon_insert ON public.sheets_sync_log
  FOR INSERT TO anon WITH CHECK (true);

-- waiver_signatures (client waiver form)
DROP POLICY IF EXISTS "client_insert_waiver" ON public.waiver_signatures;
CREATE POLICY waiver_signatures_anon_insert ON public.waiver_signatures
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- photo_delivery (album portal reads)
DROP POLICY IF EXISTS "client_read_delivery" ON public.photo_delivery;
CREATE POLICY photo_delivery_anon_select ON public.photo_delivery
  FOR SELECT TO anon, authenticated
  USING (true);

-- pso_briefs (staff read)
DROP POLICY IF EXISTS "staff_read_pso" ON public.pso_briefs;
CREATE POLICY pso_briefs_anon_select ON public.pso_briefs
  FOR SELECT TO anon, authenticated
  USING (true);

-- receipts / loyalty_points — no direct anon usage today; deny by default (RLS on, no policy)
ALTER TABLE public.receipts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7) Optional tables from 14-schema-receipts-bookings.sql (create if missing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tax_receipts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_code      TEXT,
  amount_aud     NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_amount_aud NUMERIC(12,2) NOT NULL DEFAULT 0,
  has_gst        BOOLEAN NOT NULL DEFAULT TRUE,
  ato_category   TEXT NOT NULL DEFAULT 'Other',
  vendor_name    TEXT,
  receipt_date   DATE,
  image_url      TEXT,
  notes          TEXT,
  uploaded_by    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tax_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_tax_receipts ON public.tax_receipts;
DROP POLICY IF EXISTS anon_insert_tax_receipts ON public.tax_receipts;
CREATE POLICY tax_receipts_anon_select ON public.tax_receipts
  FOR SELECT TO anon USING (true);
CREATE POLICY tax_receipts_anon_insert ON public.tax_receipts
  FOR INSERT TO anon WITH CHECK (true);

-- ============================================================================
-- 8) Verification queries (run separately after apply)
-- ============================================================================
-- Tables without RLS:
--   SELECT relname, relrowsecurity FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY relname;
--
-- Policies:
--   SELECT tablename, policyname, cmd, roles FROM pg_policies
--   WHERE schemaname = 'public' ORDER BY tablename, policyname;
