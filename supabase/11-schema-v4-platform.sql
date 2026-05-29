-- Trip2Talk V4 platform tables (Task 18) — additive; keeps tours + tour_bookings names

ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS anonymized_title TEXT,
  ADD COLUMN IF NOT EXISTS trip_type TEXT,
  ADD COLUMN IF NOT EXISTS price_per_person NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS max_pax INT,
  ADD COLUMN IF NOT EXISTS min_pax INT DEFAULT 6,
  ADD COLUMN IF NOT EXISTS environment_tags TEXT[];

ALTER TABLE tour_bookings
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS pax_count INT,
  ADD COLUMN IF NOT EXISTS pickup_type TEXT,
  ADD COLUMN IF NOT EXISTS pickup_suburb TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT,
  ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS trip_date DATE,
  ADD COLUMN IF NOT EXISTS sheets_row_id TEXT;

CREATE TABLE IF NOT EXISTS photo_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES tour_bookings(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'backup',
  highlight_ready_at TIMESTAMPTZ,
  full_delivered_at TIMESTAMPTZ,
  album_url TEXT,
  expiry_date TIMESTAMPTZ,
  drive_folder_url TEXT,
  last_downloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pso_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  composition_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  lighting_notes TEXT,
  lens_recommendations TEXT,
  environment_tags TEXT[],
  is_locked BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  booking_id UUID REFERENCES tour_bookings(id) ON DELETE SET NULL,
  points INT NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'Silver',
  last_review_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- waiver_signatures + receipts extended in 10-schema-sync-pipeline.sql

CREATE INDEX IF NOT EXISTS idx_photo_delivery_booking ON photo_delivery(booking_id);
CREATE INDEX IF NOT EXISTS idx_tour_bookings_access_token ON tour_bookings(access_token);
CREATE INDEX IF NOT EXISTS idx_pso_briefs_tour ON pso_briefs(tour_id);
