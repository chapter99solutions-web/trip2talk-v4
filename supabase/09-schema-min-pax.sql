-- TASK 21D — Minimum Pax = 1 (solo travellers)
-- NOTE: this project uses `party_pax` (not `pax`) on `tour_bookings`.

ALTER TABLE tour_bookings
  DROP CONSTRAINT IF EXISTS check_min_pax;

ALTER TABLE tour_bookings
  ADD CONSTRAINT check_min_pax CHECK (party_pax >= 1);

