-- TASK 18 — Index for delivered albums nearing expiry
CREATE INDEX IF NOT EXISTS idx_bookings_album_expires
  ON tour_bookings(album_expires_at)
  WHERE album_status = 'delivered';
