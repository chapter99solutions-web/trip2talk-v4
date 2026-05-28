-- TASK 18A — Album delivery status + Facebook inbox helpers

ALTER TABLE tour_bookings
  ADD COLUMN IF NOT EXISTS album_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS album_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_chat_url TEXT,
  ADD COLUMN IF NOT EXISTS album_expires_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tour_bookings_album_status_check'
  ) THEN
    ALTER TABLE tour_bookings
      ADD CONSTRAINT tour_bookings_album_status_check
      CHECK (album_status IN ('pending', 'processing', 'delivered', 'expired'));
  END IF;
END $$;

COMMENT ON COLUMN tour_bookings.album_status IS 'pending | processing | delivered | expired';
COMMENT ON COLUMN tour_bookings.facebook_chat_url IS 'Direct Messenger thread URL (staff-entered)';

-- Keep album_expires_at in sync with expires_at when delivery is marked
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
      album_status = 'delivered',
      album_delivered_at = v_now,
      expires_at = v_expires,
      album_expires_at = v_expires,
      journey_phase = 'receive'
    WHERE id = p_booking_id;
  ELSIF p_client_id IS NOT NULL AND p_tour_id IS NOT NULL THEN
    UPDATE tour_bookings
    SET
      album_status = 'delivered',
      album_delivered_at = v_now,
      expires_at = v_expires,
      album_expires_at = v_expires,
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
    'expires_at', v_expires,
    'album_expires_at', v_expires
  );
END;
$$;
