-- Trip2Talk V4 — Sync pipeline write-back columns (GAS ↔ Supabase via sync-pipeline edge function)

ALTER TABLE tour_bookings
  ADD COLUMN IF NOT EXISTS sheets_row_id TEXT;

COMMENT ON COLUMN tour_bookings.sheets_row_id IS 'Google Sheets row id returned by Apps Script sync_booking';

CREATE TABLE IF NOT EXISTS waiver_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES tour_bookings(id) ON DELETE SET NULL,
  client_waiver_id UUID REFERENCES client_waivers(id) ON DELETE SET NULL,
  pdf_url TEXT,
  sheets_row_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waiver_signatures_booking ON waiver_signatures(booking_id);

CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES tour_bookings(id) ON DELETE SET NULL,
  reference_number TEXT,
  drive_url TEXT,
  sheets_row_id TEXT,
  amount_aud NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_booking ON receipts(booking_id);
CREATE INDEX IF NOT EXISTS idx_receipts_reference ON receipts(reference_number);
