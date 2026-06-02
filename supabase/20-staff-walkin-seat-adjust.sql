-- Trip2Talk V4 — Co-Host walk-in +/- (no departure_start gate for staff)
-- Run after 16 + 17. Safe to re-run (CREATE OR REPLACE).

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
    RAISE EXCEPTION 'TRIP_NOT_OPEN'
      USING ERRCODE = 'P0001', HINT = 'tour not found for trip_code';
  END IF;

  IF p_delta > 0 THEN
    UPDATE public.tours
       SET slots_booked = slots_booked + p_delta
     WHERE id = v_tour.id
       AND (slots_max IS NULL OR slots_booked + p_delta <= slots_max)
    RETURNING slots_booked INTO v_new;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      RAISE EXCEPTION 'TRIP_FULL'
        USING ERRCODE = 'P0001', HINT = 'slots_booked would exceed slots_max';
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

-- Optional alias matching GAS action name (Supabase RPC from Co-Host terminal).
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
