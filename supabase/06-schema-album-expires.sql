-- Trip2Talk V4 — Album link expiry (60 days, not 90)

ALTER TABLE tour_bookings
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE crm_clients
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

COMMENT ON COLUMN tour_bookings.expires_at IS 'Private album signed-link expiry: now() + 60 days at delivery';
COMMENT ON COLUMN crm_clients.expires_at IS 'Latest album link expiry for this client';

/** Canonical expiry timestamp for new album deliveries. */
CREATE OR REPLACE FUNCTION album_link_expires_at()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$
  SELECT NOW() + INTERVAL '60 days';
$$;

/**
 * Marks album delivered and sets expires_at = now() + interval '60 days' (not 90).
 * Returns ISO timestamps for Edge Function / API callers.
 */
CREATE OR REPLACE FUNCTION mark_album_delivered(
  p_tour_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_expires TIMESTAMPTZ := album_link_expires_at();
BEGIN
  IF p_booking_id IS NOT NULL THEN
    UPDATE tour_bookings
    SET
      album_delivered_at = v_now,
      expires_at = v_expires,
      journey_phase = 'receive'
    WHERE id = p_booking_id;
  ELSIF p_client_id IS NOT NULL AND p_tour_id IS NOT NULL THEN
    UPDATE tour_bookings
    SET
      album_delivered_at = v_now,
      expires_at = v_expires,
      journey_phase = 'receive'
    WHERE client_id = p_client_id AND tour_id = p_tour_id;
  END IF;

  IF p_client_id IS NOT NULL THEN
    UPDATE crm_clients
    SET
      album_delivered_at = v_now,
      expires_at = v_expires,
      journey_phase = 'receive'
    WHERE id = p_client_id;
  END IF;

  RETURN jsonb_build_object(
    'album_delivered_at', v_now,
    'expires_at', v_expires
  );
END;
$$;
