-- Trip2Talk V4 — structured waiver payload on bookings mirror row

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS waiver_data JSONB;

COMMENT ON COLUMN public.bookings.waiver_data IS 'Checkout WaiverForm payload (health, risk, minors, photo consent)';
