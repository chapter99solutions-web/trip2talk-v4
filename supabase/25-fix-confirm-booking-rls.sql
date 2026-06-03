-- Fix Confirm Booking: create public.bookings + anon INSERT (portal/intake mirror)
-- V4 operational booking + seats live in tour_bookings + claim_seat_and_book RPC.

-- bookings table (portal/intake — platformBookings.ts)
CREATE TABLE IF NOT EXISTS public.bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id    TEXT UNIQUE,
  client_name    TEXT NOT NULL,
  email          TEXT,
  trip_id        TEXT,
  trip_name      TEXT,
  departure_date DATE,
  intake_status  TEXT NOT NULL DEFAULT 'pending'
    CHECK (intake_status IN ('pending', 'complete')),
  total_amount   NUMERIC NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_external_id ON public.bookings (external_id);
CREATE INDEX IF NOT EXISTS idx_bookings_departure ON public.bookings (departure_date);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_staff_owner_read" ON public.bookings;
CREATE POLICY "bookings_staff_owner_read" ON public.bookings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS anon_insert_bookings ON public.bookings;
CREATE POLICY anon_insert_bookings ON public.bookings
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS anon_select_bookings ON public.bookings;
CREATE POLICY anon_select_bookings ON public.bookings
  FOR SELECT TO anon USING (true);

-- Ensure tour_bookings anon policies remain (operational booking row)
ALTER TABLE public.tour_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_insert_tour_bookings ON public.tour_bookings;
CREATE POLICY anon_insert_tour_bookings ON public.tour_bookings
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS anon_select_tour_bookings ON public.tour_bookings;
CREATE POLICY anon_select_tour_bookings ON public.tour_bookings
  FOR SELECT TO anon USING (true);

-- tours: anon can read all rows (booking lookup + availability)
ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_select_tours ON public.tours;
CREATE POLICY anon_select_tours ON public.tours
  FOR SELECT TO anon USING (true);
