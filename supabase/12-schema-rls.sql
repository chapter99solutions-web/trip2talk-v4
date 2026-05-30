-- Trip2Talk V4 — RLS for the 13 previously-unprotected tables (HYBRID model)
--
-- Architecture note: the PWA talks to Supabase with the PUBLIC anon key only
-- (no Supabase Auth session; PIN auth is enforced client-side). Edge Functions
-- use the service-role key, which BYPASSES RLS — so locking anon down here does
-- NOT affect any function in supabase/functions/*.
--
-- HYBRID intent:
--   * Hard-deny anon on tables the frontend never touches directly.
--   * Grant anon only the exact operations the app performs today, scoped per
--     table (e.g. INSERT-only where the app never reads the rows back).
--
-- Re-runnable: DROP POLICY IF EXISTS precedes every CREATE POLICY, and
-- ENABLE ROW LEVEL SECURITY is idempotent.
--
-- KNOWN RESIDUAL EXPOSURE (accepted for hybrid): crm_clients and expenses
-- remain anon-readable because the owner/staff dashboards SELECT them directly
-- with the anon key. Move those reads behind an Edge Function to fully close.

-- ============================================================================
-- GROUP A — Hard deny anon (RLS enabled, NO permissive policy).
-- The frontend never queries these with the anon key. All access is via
-- SECURITY DEFINER RPCs (verify_pin) or service-role Edge Functions, both of
-- which bypass RLS.
-- ============================================================================
ALTER TABLE pin_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payid_pool         ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrr_snapshots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments  ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GROUP B — Narrow anon policies matching current app usage.
-- ============================================================================

-- tenants — app reads tenant id/slug (src/lib/customerJourney.ts, auth flows)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_tenants ON tenants;
CREATE POLICY anon_select_tenants ON tenants
  FOR SELECT TO anon USING (true);

-- crm_clients — app SELECT (*), INSERT, UPDATE (supabaseData.ts, customerJourney.ts)
-- NOTE: anon can still read PII here (passport/medical/OSHC). Hybrid trade-off.
ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_crm_clients ON crm_clients;
CREATE POLICY anon_select_crm_clients ON crm_clients
  FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS anon_insert_crm_clients ON crm_clients;
CREATE POLICY anon_insert_crm_clients ON crm_clients
  FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS anon_update_crm_clients ON crm_clients;
CREATE POLICY anon_update_crm_clients ON crm_clients
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- expenses — app SELECT (*) + INSERT (supabaseData.ts, customerJourney.ts)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_expenses ON expenses;
CREATE POLICY anon_select_expenses ON expenses
  FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS anon_insert_expenses ON expenses;
CREATE POLICY anon_insert_expenses ON expenses
  FOR INSERT TO anon WITH CHECK (true);

-- client_waivers — app SELECT only (waiverApi.ts). Writes go through the
-- record-waiver Edge Function (service role), so NO anon insert/update/delete.
ALTER TABLE client_waivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_client_waivers ON client_waivers;
CREATE POLICY anon_select_client_waivers ON client_waivers
  FOR SELECT TO anon USING (true);

-- safety_briefings — app INSERT only, never read back (customerJourney.ts)
ALTER TABLE safety_briefings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_insert_safety_briefings ON safety_briefings;
CREATE POLICY anon_insert_safety_briefings ON safety_briefings
  FOR INSERT TO anon WITH CHECK (true);

-- net_settlements — app INSERT only, never read back (customerJourney.ts)
-- Financial data stays unreadable by anon.
ALTER TABLE net_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_insert_net_settlements ON net_settlements;
CREATE POLICY anon_insert_net_settlements ON net_settlements
  FOR INSERT TO anon WITH CHECK (true);

-- sheets_sync_log — app INSERT only, never read back (customerJourney.ts)
ALTER TABLE sheets_sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_insert_sheets_sync_log ON sheets_sync_log;
CREATE POLICY anon_insert_sheets_sync_log ON sheets_sync_log
  FOR INSERT TO anon WITH CHECK (true);
