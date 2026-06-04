-- Reserve seats by party size (not +1 only) inside claim_seat_and_book.

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
  v_seats      INT := GREATEST(1, COALESCE(p_party_pax, 1));
BEGIN
  IF v_code = '' THEN
    RAISE EXCEPTION 'TRIP_NOT_OPEN'
      USING ERRCODE = 'P0001', HINT = 'empty trip code';
  END IF;

  SELECT * INTO v_tour
  FROM public.tours
  WHERE trip_code = v_code
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND OR v_tour.departure_start IS NULL THEN
    RAISE EXCEPTION 'TRIP_NOT_OPEN'
      USING ERRCODE = 'P0001',
            HINT = 'departure_start is NULL or tour not found for trip_code';
  END IF;

  UPDATE public.tours
     SET slots_booked = slots_booked + v_seats
   WHERE id = v_tour.id
     AND (slots_max IS NULL OR slots_booked + v_seats <= slots_max);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'TRIP_FULL'
      USING ERRCODE = 'P0001',
            HINT = 'not enough seats for party size';
  END IF;

  INSERT INTO public.tour_bookings (
    tenant_id, tour_id, client_id, amount_paid_aud, status, payment_method,
    reference_number, party_pax, trip_size_tier, preferred_pickup,
    journey_phase, trip_date
  ) VALUES (
    COALESCE(p_tenant_id, v_tour.tenant_id), v_tour.id, p_client_id,
    COALESCE(p_amount_paid_aud, 0), 'PENDING', p_payment_method,
    p_reference_number, v_seats, p_trip_size_tier, p_pickup,
    'book', COALESCE(p_trip_date, v_tour.departure_start)
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_seat_and_book(
  UUID, TEXT, UUID, NUMERIC, TEXT, INT, TEXT, TEXT, TEXT, DATE
) TO anon, authenticated;
