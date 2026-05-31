-- 15-schema-one-trip-per-day.sql
-- กฎ "หนึ่งทริปต่อหนึ่งวัน" (one trip per day)
-- รันไฟล์นี้ใน Supabase SQL Editor.
--
-- เหตุผลของ scope: ธุรกิจวิ่งทริปได้วันละ 1 ทริป (ทีม/รถชุดเดียว) จึงบังคับ
-- ไม่ซ้ำที่ระดับ (tenant_id, trip_date). ถ้าต้องการอนุญาตหลายทัวร์ต่อวัน
-- (คนละ tour) ให้เปลี่ยนเป็น UNIQUE (tour_id, trip_date) แทน.

-- 1) เพิ่มคอลัมน์วันเดินทาง
alter table public.tour_bookings
  add column if not exists trip_date date;

-- 2) ดัชนี UNIQUE แบบมีเงื่อนไข (partial): นับเฉพาะการจองที่ยังไม่ถูกยกเลิก
--    เพื่อไม่ให้มี 2 การจอง (ที่ยัง active) ในวันเดียวกันต่อหนึ่ง tenant.
--    การจองที่ status = 'CANCELLED' จะไม่ถูกนับ (ปล่อยวันให้จองใหม่ได้).
create unique index if not exists tour_bookings_one_trip_per_day
  on public.tour_bookings (tenant_id, trip_date)
  where trip_date is not null and status <> 'CANCELLED';

-- 3) ดัชนีช่วยค้นหา availability ตามวันเร็วขึ้น
create index if not exists idx_tour_bookings_trip_date
  on public.tour_bookings (trip_date);
