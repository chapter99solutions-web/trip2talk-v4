-- Phase 1 complete: RLS for dashboards, cover images, seat RPCs (niuibpznjvytprbrzvnn)
-- Safe to re-run (idempotent).

-- ---------------------------------------------------------------------------
-- 1) tour_bookings — anon read/insert for PIN dashboards + public booking
-- ---------------------------------------------------------------------------
ALTER TABLE public.tour_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_select_tour_bookings ON public.tour_bookings;
CREATE POLICY anon_select_tour_bookings ON public.tour_bookings
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_insert_tour_bookings ON public.tour_bookings;
CREATE POLICY anon_insert_tour_bookings ON public.tour_bookings
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS anon_update_tour_bookings ON public.tour_bookings;
CREATE POLICY anon_update_tour_bookings ON public.tour_bookings
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2) cover_image on public.tours (verified portfolio bucket paths)
--    Note: bucket folders are Tasmania/, New Zealand/Cover/, Cowra/, etc.
--    (not Tasmania 02/ or NZ/ — those paths 404 in storage)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS cover_image TEXT;

UPDATE public.tours SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Tasmania/Hobart/1.jpg'
WHERE trip_code = 'TAS-3D2N';

UPDATE public.tours SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Melbourne/01.jpg'
WHERE trip_code = 'MEL-4D3N';

UPDATE public.tours SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Ulruru/1.jpg'
WHERE trip_code = 'ULU-4D3N';

UPDATE public.tours SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/New%20Zealand/Cover/01.jpg'
WHERE trip_code = 'NZ-6D5N';

UPDATE public.tours SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Tasmania/Launceston/594961969_1428638085927955_7817067387013979508_n.jpg'
WHERE trip_code = 'TAS-LH-4D3N';

UPDATE public.tours SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/One%20day%20trip%20SYD/35225886_2066269863700629_8276990772163641344_n.jpg'
WHERE trip_code = 'KIA-1DAY';

UPDATE public.tours SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Cowra/1.jpg'
WHERE trip_code = 'CAN-2D1N';

UPDATE public.tours SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/One%20day%20trip%20SYD/35225886_2066269863700629_8276990772163641344_n.jpg'
WHERE trip_code = 'SYD-1DAY';

-- ---------------------------------------------------------------------------
-- 3) Departure dates for date-gate (claim_seat_and_book)
-- ---------------------------------------------------------------------------
UPDATE public.tours
SET
  departure_start = COALESCE(departure_start, start_date),
  departure_end = COALESCE(departure_end, end_date),
  slots_max = COALESCE(slots_max, max_pax),
  slots_booked = COALESCE(slots_booked, 0)
WHERE trip_code IN (
  'TAS-3D2N', 'MEL-4D3N', 'ULU-4D3N', 'NZ-6D5N',
  'TAS-LH-4D3N', 'KIA-1DAY', 'CAN-2D1N', 'SYD-1DAY'
);

-- ---------------------------------------------------------------------------
-- 4) claim_seat_and_book — trip_code lookup with optional tenant (from 23)
-- ---------------------------------------------------------------------------
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
  v_code       TEXT := upper(trim(p_tour_code));
BEGIN
  IF v_code = '' THEN
    RAISE EXCEPTION 'TRIP_NOT_OPEN' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_tour
  FROM public.tours
  WHERE trip_code = v_code
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND OR v_tour.departure_start IS NULL THEN
    RAISE EXCEPTION 'TRIP_NOT_OPEN' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.tours
     SET slots_booked = slots_booked + 1
   WHERE id = v_tour.id
     AND (slots_max IS NULL OR slots_booked < slots_max);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'TRIP_FULL' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.tour_bookings (
    tenant_id, tour_id, client_id, amount_paid_aud, status, payment_method,
    reference_number, party_pax, trip_size_tier, preferred_pickup,
    journey_phase, trip_date
  ) VALUES (
    COALESCE(p_tenant_id, v_tour.tenant_id), v_tour.id, p_client_id,
    COALESCE(p_amount_paid_aud, 0), 'PENDING', p_payment_method,
    p_reference_number, p_party_pax, p_trip_size_tier, p_pickup,
    'book', COALESCE(p_trip_date, v_tour.departure_start)
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_seat_and_book(
  UUID, TEXT, UUID, NUMERIC, TEXT, INT, TEXT, TEXT, TEXT, DATE
) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) staff_adjust_seat + increment_slot (Co-Host walk-in +/-)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.staff_adjust_seat(
  p_tenant_id UUID,
  p_tour_code TEXT,
  p_delta     INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tour    public.tours%ROWTYPE;
  v_updated INT;
  v_new     INT;
  v_code    TEXT := upper(trim(p_tour_code));
BEGIN
  IF p_delta = 0 OR v_code = '' THEN
    RAISE EXCEPTION 'INVALID_DELTA' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_tour
  FROM public.tours
  WHERE trip_code = v_code
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRIP_NOT_OPEN' USING ERRCODE = 'P0001';
  END IF;

  IF p_delta > 0 THEN
    UPDATE public.tours
       SET slots_booked = slots_booked + p_delta
     WHERE id = v_tour.id
       AND (slots_max IS NULL OR slots_booked + p_delta <= slots_max)
    RETURNING slots_booked INTO v_new;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      RAISE EXCEPTION 'TRIP_FULL' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    UPDATE public.tours
       SET slots_booked = GREATEST(slots_booked + p_delta, 0)
     WHERE id = v_tour.id
    RETURNING slots_booked INTO v_new;
  END IF;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_adjust_seat(UUID, TEXT, INT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_slot(
  p_tour_code TEXT,
  p_by        INT DEFAULT 1
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant UUID;
BEGIN
  SELECT id INTO v_tenant FROM public.tenants ORDER BY created_at LIMIT 1;
  RETURN public.staff_adjust_seat(v_tenant, p_tour_code, p_by);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_slot(TEXT, INT) TO anon, authenticated;
