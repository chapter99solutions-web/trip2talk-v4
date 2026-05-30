-- Trip2Talk V4 — Staff receipt upload (Tax Claim) + bookings table fix
-- Re-runnable: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS before each CREATE POLICY.
-- Follows the HYBRID RLS model from supabase/12-schema-rls.sql:
--   the PWA talks to Supabase with the PUBLIC anon key only (PIN auth is client-side),
--   so anon is granted exactly the operations the app performs and nothing more.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor) or via:
--   npx supabase db query --linked -f supabase/14-schema-receipts-bookings.sql

-- ============================================================================
-- PART 1 — tax_receipts (Staff Dashboard "อัปโหลดใบเสร็จ (Tax Claim)")
-- ----------------------------------------------------------------------------
-- A dedicated table for tax-claim receipts. NOTE: a `receipts` table already
-- exists (supabase/10-schema-sync-pipeline.sql) for booking *payment* receipts
-- (reference_number / drive_url synced from Google Sheets). To avoid conflating
-- the two concepts — and to capture image_url, receipt_date, notes, uploaded_by,
-- and a free-text trip_code the staff app actually has — we use tax_receipts.
-- ============================================================================
CREATE TABLE IF NOT EXISTS tax_receipts (
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

CREATE INDEX IF NOT EXISTS idx_tax_receipts_trip_code ON tax_receipts(trip_code);
CREATE INDEX IF NOT EXISTS idx_tax_receipts_date ON tax_receipts(receipt_date DESC);

-- GST safety net: AU GST is 1/11 of a GST-inclusive total. The frontend also
-- computes this, but the trigger guarantees consistency on any direct insert.
CREATE OR REPLACE FUNCTION tax_receipts_set_gst()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.has_gst THEN
    NEW.gst_amount_aud := ROUND((NEW.amount_aud / 11)::numeric, 2);
  ELSE
    NEW.gst_amount_aud := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tax_receipts_set_gst ON tax_receipts;
CREATE TRIGGER trg_tax_receipts_set_gst
  BEFORE INSERT OR UPDATE OF amount_aud, has_gst ON tax_receipts
  FOR EACH ROW
  EXECUTE FUNCTION tax_receipts_set_gst();

-- RLS: anon SELECT + INSERT (staff dashboard reads the summary back and inserts
-- new rows with the anon key). Mirrors the `expenses` policy in 12-schema-rls.sql.
ALTER TABLE tax_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_tax_receipts ON tax_receipts;
CREATE POLICY anon_select_tax_receipts ON tax_receipts
  FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS anon_insert_tax_receipts ON tax_receipts;
CREATE POLICY anon_insert_tax_receipts ON tax_receipts
  FOR INSERT TO anon WITH CHECK (true);

-- ============================================================================
-- PART 2 — Storage bucket 'receipts'
-- ----------------------------------------------------------------------------
-- The receipt files upload to Storage bucket 'receipts' at
-- `{trip_code}/{YYYY-MM-DD}_{timestamp}_{filename}`.
--
-- Create the bucket in Dashboard → Storage → New bucket → name: receipts
-- (mark it Public so getPublicUrl() works), OR run the SQL below.
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Anon may upload to and read from the 'receipts' bucket (PWA uses the anon key).
DROP POLICY IF EXISTS "receipts_anon_insert" ON storage.objects;
CREATE POLICY "receipts_anon_insert" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'receipts');
DROP POLICY IF EXISTS "receipts_anon_select" ON storage.objects;
CREATE POLICY "receipts_anon_select" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'receipts');
DROP POLICY IF EXISTS "receipts_anon_update" ON storage.objects;
CREATE POLICY "receipts_anon_update" ON storage.objects
  FOR UPDATE TO anon USING (bucket_id = 'receipts') WITH CHECK (bucket_id = 'receipts');

-- ============================================================================
-- PART 3 — bookings table fix
-- ----------------------------------------------------------------------------
-- ROOT CAUSE of "Could not find the table 'public.bookings' in the schema cache":
-- src/lib/platformBookings.ts queries public.bookings, but that table is only
-- defined in supabase/migrations/002_portal_intake_schema.sql — which is NOT in
-- the numbered run order documented in supabase/README.md (00 → 10). On the live
-- project it was never created, so PostgREST has no `bookings` in its cache.
--
-- The schema below is identical to migration 002 (idempotent), so running this
-- file creates the table the frontend already expects. We do NOT repurpose
-- tour_bookings: its columns (tour_id UUID, booking_status enum, etc.) differ
-- from what platformBookings.ts selects (external_id, trip_name, intake_status…).
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id    text UNIQUE,
  client_name    text NOT NULL,
  email          text,
  trip_id        text,
  trip_name      text,
  departure_date date,
  intake_status  text NOT NULL DEFAULT 'pending'
    CHECK (intake_status IN ('pending', 'complete')),
  total_amount   numeric NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_links (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  token      uuid NOT NULL DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_links_token_idx ON portal_links (token);
CREATE INDEX IF NOT EXISTS portal_links_booking_idx ON portal_links (booking_id);

CREATE TABLE IF NOT EXISTS intake_forms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  responses    jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intake_forms_booking_idx ON intake_forms (booking_id);

ALTER TABLE bookings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_forms ENABLE ROW LEVEL SECURITY;

-- bookings: staff/owner dashboards read all (anon key, PIN-gated client-side).
DROP POLICY IF EXISTS "bookings_staff_owner_read" ON bookings;
CREATE POLICY "bookings_staff_owner_read" ON bookings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "bookings_client_read_own" ON bookings;
CREATE POLICY "bookings_client_read_own" ON bookings
  FOR SELECT TO authenticated
  USING (email IS NOT NULL AND email = coalesce(auth.jwt() ->> 'email', ''));

-- portal_links: anon can read non-expired rows (app filters by token).
DROP POLICY IF EXISTS "portal_links_public_read" ON portal_links;
CREATE POLICY "portal_links_public_read" ON portal_links
  FOR SELECT TO anon, authenticated
  USING (expires_at > now());

-- intake_forms: readable by staff/owner.
DROP POLICY IF EXISTS "intake_forms_staff_read" ON intake_forms;
CREATE POLICY "intake_forms_staff_read" ON intake_forms
  FOR SELECT USING (true);
