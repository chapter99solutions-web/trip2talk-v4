-- RUNME-all-seat-lock.sql
-- Trip2Talk V4 — รันไฟล์เดียวใน Supabase SQL Editor (Dashboard → SQL Editor → Run)
-- รวม: (1) one-trip-per-day  (2) seat-limit + date-gate RPCs  (3) เปิดจอง TAS-3D2N
-- ปลอดภัยต่อการรันซ้ำ: IF NOT EXISTS, CREATE OR REPLACE, DROP ... IF EXISTS

-- =============================================================================
-- PART 1 — supabase/15-schema-one-trip-per-day.sql
-- กฎ "หนึ่งทริปต่อหนึ่งวัน" (one trip per day)
-- =============================================================================

ALTER TABLE public.tour_bookings
  ADD COLUMN IF NOT EXISTS trip_date DATE;

CREATE UNIQUE INDEX IF NOT EXISTS tour_bookings_one_trip_per_day
  ON public.tour_bookings (tenant_id, trip_date)
  WHERE trip_date IS NOT NULL AND status <> 'CANCELLED';

CREATE INDEX IF NOT EXISTS idx_tour_bookings_trip_date
  ON public.tour_bookings (trip_date);

-- =============================================================================
-- PART 2 — supabase/16-schema-seat-limit-date-gate.sql
-- Seat limit + date gate (atomic booking RPC)
-- =============================================================================

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS slots_booked    INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS slots_max       INT,
  ADD COLUMN IF NOT EXISTS departure_start DATE,
  ADD COLUMN IF NOT EXISTS departure_end   DATE;

UPDATE public.tours SET slots_booked = 0 WHERE slots_booked IS NULL;
UPDATE public.tours
   SET slots_max = COALESCE(slots_max, max_pax)
 WHERE slots_max IS NULL AND max_pax IS NOT NULL;

ALTER TABLE public.tours DROP CONSTRAINT IF EXISTS tours_slots_within_capacity;
ALTER TABLE public.tours
  ADD CONSTRAINT tours_slots_within_capacity
  CHECK (slots_booked >= 0 AND (slots_max IS NULL OR slots_booked <= slots_max));

CREATE OR REPLACE FUNCTION public.claim_seat_and_book(
  p_tenant_id        UUID,
  p_tour_code        TEXT,
  p_client_id        UUID,
  p_amount_paid_aud  NUMERIC,
  p_reference_number TEXT,
  p_party_pax        INT,
  p_trip_size_tier   TEXT,
  p_pickup           TEXT,
  p_payment_method   TEXT,
  p_trip_date        DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tour       public.tours%ROWTYPE;
  v_updated    INT;
  v_booking_id UUID;
BEGIN
  SELECT * INTO v_tour
  FROM public.tours
  WHERE tenant_id = p_tenant_id
    AND trip_code = p_tour_code
  FOR UPDATE;

  IF NOT FOUND OR v_tour.departure_start IS NULL THEN
    RAISE EXCEPTION 'TRIP_NOT_OPEN'
      USING ERRCODE = 'P0001',
            HINT = 'departure_start is NULL or tour not found';
  END IF;

  UPDATE public.tours
     SET slots_booked = slots_booked + 1
   WHERE id = v_tour.id
     AND (slots_max IS NULL OR slots_booked < slots_max);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'TRIP_FULL'
      USING ERRCODE = 'P0001',
            HINT = 'slots_booked has reached slots_max';
  END IF;

  INSERT INTO public.tour_bookings (
    tenant_id, tour_id, client_id, amount_paid_aud, status, payment_method,
    reference_number, party_pax, trip_size_tier, preferred_pickup,
    journey_phase, trip_date
  ) VALUES (
    p_tenant_id, v_tour.id, p_client_id, COALESCE(p_amount_paid_aud, 0), 'PENDING',
    p_payment_method, p_reference_number, p_party_pax, p_trip_size_tier, p_pickup,
    'book', COALESCE(p_trip_date, v_tour.departure_start)
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_seat_and_book(
  UUID, TEXT, UUID, NUMERIC, TEXT, INT, TEXT, TEXT, TEXT, DATE
) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.release_trip_seat(
  p_tenant_id UUID,
  p_tour_code TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tours
     SET slots_booked = GREATEST(slots_booked - 1, 0)
   WHERE tenant_id = p_tenant_id
     AND trip_code = p_tour_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_trip_seat(UUID, TEXT) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_tours_trip_code ON public.tours (trip_code);

-- =============================================================================
-- PART 3 — เปิดจอง TAS-3D2N (safe to re-run)
-- =============================================================================

UPDATE public.tours SET
  departure_start = '2026-03-16',
  departure_end   = '2026-03-18',
  slots_max       = 6
WHERE trip_code = 'TAS-3D2N';
