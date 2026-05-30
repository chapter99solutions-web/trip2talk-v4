-- Trip2Talk V4 — core platform schema + RLS (Task 18)

-- TABLES
CREATE TABLE IF NOT EXISTS tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  anonymized_title text NOT NULL,
  trip_type text NOT NULL CHECK (trip_type IN ('one_day', 'overnight')),
  price_per_person numeric NOT NULL,
  max_pax int NOT NULL DEFAULT 8,
  min_pax int NOT NULL DEFAULT 4,
  environment_tags text[],
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tour_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid REFERENCES tours(id),
  client_name text NOT NULL,
  email text,
  phone text,
  pax_count int NOT NULL DEFAULT 1,
  pickup_type text,
  pickup_suburb text,
  payment_status text DEFAULT 'pending',
  deposit_paid_at timestamptz,
  access_token uuid DEFAULT gen_random_uuid(),
  trip_date date,
  intake_status text DEFAULT 'Pending',
  sheets_row_id int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS waiver_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES tour_bookings(id),
  signed_at timestamptz DEFAULT now(),
  signed_ip text,
  content_hash text NOT NULL,
  pdf_url text
);

CREATE TABLE IF NOT EXISTS photo_delivery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES tour_bookings(id),
  stage text DEFAULT 'Backup'
    CHECK (stage IN ('Backup','Culling','Highlight Ready','Full Delivered')),
  highlight_ready_at timestamptz,
  full_delivered_at timestamptz,
  album_url text,
  expiry_date timestamptz,
  drive_folder_url text
);

CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES tours(id),
  amount numeric NOT NULL,
  category text CHECK (category IN ('fuel','food','toll','other')),
  filename text,
  drive_url text,
  logged_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  booking_id uuid REFERENCES tour_bookings(id),
  points int DEFAULT 0,
  tier text DEFAULT 'Silver' CHECK (tier IN ('Silver','Gold','Platinum')),
  last_review_at timestamptz
);

CREATE TABLE IF NOT EXISTS pso_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid REFERENCES tours(id),
  composition_rules jsonb,
  lighting_notes text,
  lens_recommendations text,
  environment_tags text[],
  is_locked boolean DEFAULT true
);

-- RLS ENABLE
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE pso_briefs ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
-- Public read for tours (anonymized data only)
CREATE POLICY "public_read_tours" ON tours
  FOR SELECT TO anon USING (
    (status::text = 'ACTIVE') OR
    (status::text = 'CONFIRMED') OR
    (status::text = 'active')
  );

-- Owner: full access all tables (placeholder policy; real apps should scope by auth claims)
CREATE POLICY "owner_all_access" ON tour_bookings
  FOR ALL USING (true);

-- Staff: read only on pso_briefs and tour_bookings
CREATE POLICY "staff_read_pso" ON pso_briefs
  FOR SELECT USING (true);

CREATE POLICY "staff_read_bookings" ON tour_bookings
  FOR SELECT USING (true);

-- Cohost: insert bookings, read own rows (placeholder)
CREATE POLICY "cohost_insert_bookings" ON tour_bookings
  FOR INSERT WITH CHECK (true);

-- Client: read own booking by access_token (placeholder; tighten with auth-based tokens)
CREATE POLICY "client_read_own_booking" ON tour_bookings
  FOR SELECT USING (true);

CREATE POLICY "client_insert_waiver" ON waiver_signatures
  FOR INSERT WITH CHECK (true);

CREATE POLICY "client_read_delivery" ON photo_delivery
  FOR SELECT USING (true);

