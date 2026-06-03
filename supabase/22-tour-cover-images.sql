-- Trip card cover images (portfolio bucket on niuibpznjvytprbrzvnn)
-- V4 uses public.tours.cover_image keyed by trip_code (not public.trips.tour_code).

ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS cover_image TEXT;

COMMENT ON COLUMN public.tours.cover_image IS 'Public URL for trip card hero/cover (portfolio bucket)';

UPDATE public.tours
SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Tasmania/Hobart/1.jpg'
WHERE trip_code = 'TAS-3D2N';

UPDATE public.tours
SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Melbourne/01.jpg'
WHERE trip_code = 'MEL-4D3N';

UPDATE public.tours
SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Ulruru/1.jpg'
WHERE trip_code = 'ULU-4D3N';

UPDATE public.tours
SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/New%20Zealand/Cover/01.jpg'
WHERE trip_code = 'NZ-6D5N';

UPDATE public.tours
SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Tasmania/Launceston/594961969_1428638085927955_7817067387013979508_n.jpg'
WHERE trip_code = 'TAS-LH-4D3N';

UPDATE public.tours
SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/One%20day%20trip%20SYD/35225886_2066269863700629_8276990772163641344_n.jpg'
WHERE trip_code = 'KIA-1DAY';

UPDATE public.tours
SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Cowra/1.jpg'
WHERE trip_code = 'CAN-2D1N';

UPDATE public.tours
SET cover_image = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/SYDNEY/505479211_10236865839535926_981414994444837633_n.jpg'
WHERE trip_code = 'SYD-1DAY';
