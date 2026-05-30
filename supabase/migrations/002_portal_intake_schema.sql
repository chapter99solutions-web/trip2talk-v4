-- Trip2Talk V4 — bookings, portal_links, intake_forms (Task 6)

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  client_name text NOT NULL,
  email text,
  trip_id text,
  trip_name text,
  departure_date date,
  intake_status text NOT NULL DEFAULT 'pending'
    CHECK (intake_status IN ('pending', 'complete')),
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_links_token_idx ON portal_links (token);
CREATE INDEX IF NOT EXISTS portal_links_booking_idx ON portal_links (booking_id);

CREATE TABLE IF NOT EXISTS intake_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intake_forms_booking_idx ON intake_forms (booking_id);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_forms ENABLE ROW LEVEL SECURITY;

-- bookings: staff/owner read all; client reads own row by email (when JWT email claim present)
DROP POLICY IF EXISTS "bookings_staff_owner_read" ON bookings;
CREATE POLICY "bookings_staff_owner_read" ON bookings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "bookings_client_read_own" ON bookings;
CREATE POLICY "bookings_client_read_own" ON bookings
  FOR SELECT TO authenticated
  USING (
    email IS NOT NULL
    AND email = coalesce(auth.jwt() ->> 'email', '')
  );

-- portal_links: anon can read non-expired rows (app filters by token)
DROP POLICY IF EXISTS "portal_links_public_read" ON portal_links;
CREATE POLICY "portal_links_public_read" ON portal_links
  FOR SELECT TO anon, authenticated
  USING (expires_at > now());

-- intake_forms: readable by staff/owner
DROP POLICY IF EXISTS "intake_forms_staff_read" ON intake_forms;
CREATE POLICY "intake_forms_staff_read" ON intake_forms
  FOR SELECT USING (true);
