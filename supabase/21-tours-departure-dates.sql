-- Set departure windows on seeded tours so claim_seat_and_book passes the date gate.
-- Safe to re-run (only fills NULL departure_start).

UPDATE public.tours
SET
  departure_start = COALESCE(departure_start, start_date),
  departure_end = COALESCE(departure_end, end_date)
WHERE trip_code IN (
  'TAS-3D2N',
  'MEL-4D3N',
  'ULU-4D3N',
  'NZ-6D5N',
  'TAS-LH-4D3N',
  'KIA-1DAY',
  'CAN-2D1N',
  'SYD-1DAY'
)
AND departure_start IS NULL;
