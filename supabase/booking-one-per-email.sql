-- One active booking per email + trip_code (run in Supabase SQL Editor on trip2talk-v4 / niuibp)
-- Mirrors public.bookings (trip_id stores tour code, e.g. TAS-3D2N).

CREATE OR REPLACE FUNCTION public.check_booking_allowed(p_email text, p_trip_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN json_build_object('ok', false, 'reason', 'missing email');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE lower(trim(email)) = lower(trim(p_email))
      AND upper(trim(trip_id)) = upper(trim(p_trip_code))
      AND status IS DISTINCT FROM 'cancelled'
  ) THEN
    RETURN json_build_object('ok', false, 'reason', 'already booked');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_booking_allowed(text, text) TO anon, authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_per_email_trip
  ON public.bookings (lower(trim(email)), upper(trim(trip_id)))
  WHERE (status IS DISTINCT FROM 'cancelled');
