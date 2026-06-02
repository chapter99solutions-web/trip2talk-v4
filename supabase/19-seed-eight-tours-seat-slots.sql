-- Trip2Talk V4 — seed 8 core trips for seat availability (Supabase: niuibpznjvytprbrzvnn)
-- Run in SQL Editor after 00–16 schemas. Safe to re-run (upsert by tour/trip code).
--
-- V4 booking reads: public.tours (trip_code, slots_booked, slots_max)
-- V5 booking RPC reads: public.trips (tour_code, seats_taken, max_seats)
-- User "slots_max" values are applied to slots_max (tours) and max_seats (trips).

DO $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT id INTO v_tenant FROM public.tenants ORDER BY created_at LIMIT 1;
  IF v_tenant IS NULL THEN
    INSERT INTO public.tenants (slug, name)
    VALUES ('trip2talk', 'Trip2Talk')
    RETURNING id INTO v_tenant;
  END IF;

  INSERT INTO public.tours (
    tenant_id,
    trip_code,
    destination,
    start_date,
    end_date,
    price_aud,
    max_pax,
    slots_booked,
    slots_max,
    status
  )
  VALUES
    (v_tenant, 'TAS-3D2N', 'Tasmania', '2026-01-01', '2026-12-31', 1350, 6, 0, 6, 'CONFIRMED'),
    (v_tenant, 'MEL-4D3N', 'Melbourne', '2026-01-01', '2026-12-31', 1550, 5, 0, 5, 'CONFIRMED'),
    (v_tenant, 'ULU-4D3N', 'Uluru', '2026-01-01', '2026-12-31', 1690, 5, 0, 5, 'CONFIRMED'),
    (v_tenant, 'NZ-6D5N', 'New Zealand', '2026-01-01', '2026-12-31', 2350, 5, 0, 5, 'CONFIRMED'),
    (v_tenant, 'TAS-LH-4D3N', 'Launceston', '2026-01-01', '2026-12-31', 1350, 5, 0, 5, 'CONFIRMED'),
    (v_tenant, 'KIA-1DAY', 'Kiama', '2026-01-01', '2026-12-31', 290, 4, 0, 4, 'CONFIRMED'),
    (v_tenant, 'CAN-2D1N', 'Cowra', '2026-01-01', '2026-12-31', 380, 4, 0, 4, 'CONFIRMED'),
    (v_tenant, 'SYD-1DAY', 'Sydney', '2026-01-01', '2026-12-31', 190, 4, 0, 4, 'CONFIRMED')
  ON CONFLICT (tenant_id, trip_code) DO UPDATE SET
    slots_max = EXCLUDED.slots_max,
    max_pax = EXCLUDED.max_pax,
    slots_booked = LEAST(COALESCE(public.tours.slots_booked, 0), EXCLUDED.slots_max),
    price_aud = EXCLUDED.price_aud,
    destination = EXCLUDED.destination,
    status = EXCLUDED.status;
END $$;

-- V5 trips table (claim_seats) — only when table exists on this project
DO $$
BEGIN
  IF to_regclass('public.trips') IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.trips (
    tour_code,
    name,
    name_th,
    price,
    max_seats,
    seats_taken,
    duration,
    season,
    cover_image
  )
  VALUES
    ('TAS-3D2N', 'Tasmania 3D2N', 'แทสเมเนีย 3 วัน 2 คืน', 1350, 6, 0, '3D2N', 'All Year', 'Tasmania/596873932_1428638042594626_8987722411601397177_n.jpg'),
    ('MEL-4D3N', 'Melbourne 4D3N', 'เมลเบิร์น 4 วัน 3 คืน', 1350, 5, 0, '4D3N', 'All Year', 'Melbourne/01.jpg'),
    ('ULU-4D3N', 'Red Desert Odyssey 4D3N', 'อูลูรู 4 วัน 3 คืน', 1690, 5, 0, '4D3N', 'All Year', 'Uluru/1.jpg'),
    ('NZ-6D5N', 'New Zealand South Island 6D5N', 'นิวซีแลนด์ 6 วัน 5 คืน', 2350, 5, 0, '6D5N', 'Spring', 'New Zealand/Spring/T2T-10.JPG'),
    ('TAS-LH-4D3N', 'The Launceston Highland 4D3N', 'ลอนเซสตัน 4 วัน 3 คืน', 1350, 5, 0, '4D3N', 'Winter', 'Tasmania/596371362_1428639202594510_8709278754225773992_n.jpg'),
    ('KIA-1DAY', 'Kiama 1 Day', 'เกียม่า 1 วัน', 290, 4, 0, '1DAY', 'All Year', 'SYD/705320467_10242162489108855_3820285517745745334_n.jpg'),
    ('CAN-2D1N', 'Cowra & Canowindra Canola Fields 2D1N', 'คาวราและทุ่งคานาล่าคาโนวินดรา 2 วัน 1 คืน', 380, 4, 0, '2D1N', 'Spring Season Only (October)', 'Cowra/12 (1).jpg'),
    ('SYD-1DAY', 'Sydney 1 Day', 'ซิดนีย์ 1 วัน', 190, 4, 0, '1DAY', 'All Year', 'SYDNEY/506861557_10236863821565478_6038697174671264606_n.jpg')
  ON CONFLICT (tour_code) DO UPDATE SET
    max_seats = EXCLUDED.max_seats,
    seats_taken = LEAST(COALESCE(public.trips.seats_taken, 0), EXCLUDED.max_seats),
    name = EXCLUDED.name,
    name_th = EXCLUDED.name_th,
    price = EXCLUDED.price,
    duration = EXCLUDED.duration,
    season = EXCLUDED.season,
    cover_image = EXCLUDED.cover_image;
END $$;

-- Verify (expect 8 rows each when tables exist):
-- SELECT trip_code, slots_booked, slots_max FROM public.tours WHERE trip_code IN ('TAS-3D2N','MEL-4D3N','ULU-4D3N','NZ-6D5N','TAS-LH-4D3N','KIA-1DAY','CAN-2D1N','SYD-1DAY');
-- SELECT tour_code, seats_taken, max_seats FROM public.trips WHERE tour_code = 'NZ-6D5N';
