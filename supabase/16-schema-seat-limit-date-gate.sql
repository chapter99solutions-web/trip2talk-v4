-- 16-schema-seat-limit-date-gate.sql
-- Trip2Talk V4 — บังคับ "จำนวนที่นั่ง" (seat limit) + "ด่านวันเดินทาง" (date gate)
-- ที่ระดับฐานข้อมูล (Postgres) แบบ ATOMIC — ป้องกัน overbooking และกันการจอง
-- ทริปที่ยัง "ไม่กำหนดวันออกเดินทาง".
--
-- รันไฟล์นี้ใน Supabase SQL Editor (Dashboard → SQL Editor → วางทั้งไฟล์ → Run).
-- ปลอดภัยต่อการรันซ้ำ (idempotent): ใช้ IF NOT EXISTS / DROP ... IF EXISTS ทุกจุด.
--
-- หมายเหตุสถาปัตยกรรม (อ่านก่อนแก้):
--   * SOURCE OF TRUTH = ตาราง public.tours (คีย์ด้วย (tenant_id, trip_code)).
--   * กฎ "หนึ่งทริปต่อหนึ่งวัน" เดิม (supabase/15-...) ยังทำงานเหมือนเดิมทุกอย่าง —
--     ยังบังคับผ่าน partial unique index บน tour_bookings(tenant_id, trip_date).
--     ไฟล์นี้เป็น "ส่วนเพิ่ม" (additive) ไม่ได้แทนที่กฎเดิม.
--   * ลำดับด่าน (precedence) ภายในฟังก์ชันจอง: DATE GATE ก่อน → แล้วค่อย SEAT GATE.

-- ============================================================================
-- 1) เพิ่มคอลัมน์ที่จำเป็นในตาราง tours (additive, nullable, ไม่ย้ายข้อมูล)
--    - slots_booked : จำนวน "การจอง (booking)" ที่ใช้ที่นั่งไปแล้ว (default 0)
--    - slots_max    : ความจุสูงสุดของทริปนี้ (NULL = ยังไม่กำหนด/ไม่จำกัด)
--    - departure_start / departure_end : ช่วงวันออกเดินทางจริงของทริป
--      (departure_start เป็น NULL/ว่าง = "ยังไม่เปิดจอง")
-- ============================================================================
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS slots_booked    INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS slots_max       INT,
  ADD COLUMN IF NOT EXISTS departure_start DATE,
  ADD COLUMN IF NOT EXISTS departure_end   DATE;

-- ============================================================================
-- 2) Backfill ค่าเริ่มต้นแบบสมเหตุสมผล
--    - slots_booked ที่ยังว่างให้เป็น 0
--    - slots_max ที่ยังว่างให้ดึงจาก max_pax (ความจุเดิมของทริป) เป็นค่าตั้งต้น
--    *** departure_start ตั้งใจ "ไม่" backfill — ให้เจ้าของกรอกวันจริงเองเพื่อ
--        เปิดการจอง (ทริปที่ยังไม่กรอก = ยังไม่เปิดจองโดยอัตโนมัติตามกฎใหม่). ***
-- ============================================================================
UPDATE public.tours SET slots_booked = 0 WHERE slots_booked IS NULL;
UPDATE public.tours
   SET slots_max = COALESCE(slots_max, max_pax)
 WHERE slots_max IS NULL AND max_pax IS NOT NULL;

-- ============================================================================
-- 3) CHECK constraint — ฐานข้อมูลจะ "ไม่มีวัน" เก็บสถานะที่ overbook ได้เลย
--    slots_booked ต้อง >= 0 และ (ถ้ากำหนด slots_max) ต้องไม่เกิน slots_max.
--    ใช้ DROP ... IF EXISTS ก่อน ADD เพื่อให้รันซ้ำได้.
-- ============================================================================
ALTER TABLE public.tours DROP CONSTRAINT IF EXISTS tours_slots_within_capacity;
ALTER TABLE public.tours
  ADD CONSTRAINT tours_slots_within_capacity
  CHECK (slots_booked >= 0 AND (slots_max IS NULL OR slots_booked <= slots_max));

-- ============================================================================
-- 4) ฟังก์ชันจองแบบ ATOMIC: claim_seat_and_book(...)
--    ทำทั้ง "ตรวจด่าน + จองที่นั่ง + สร้างแถว booking" ภายใน transaction เดียว
--    เรียกผ่าน supabase.rpc('claim_seat_and_book', {...}).
--
--    SECURITY DEFINER + search_path = public : ให้ฟังก์ชันทำงานด้วยสิทธิเจ้าของ
--    (ข้าม RLS) เพื่ออัปเดต tours + insert tour_bookings ได้แน่นอน. ตรรกะการกัน
--    overbooking อยู่ในฟังก์ชันนี้ทั้งหมด จึง bypass ผ่าน UI ไม่ได้.
--
--    ลำดับด่าน (สำคัญ):
--      ด่าน 1 (DATE GATE) : ไม่พบทริป หรือ departure_start IS NULL → 'TRIP_NOT_OPEN'
--      ด่าน 2 (SEAT GATE) : UPDATE แบบมีเงื่อนไข (atomic) เพิ่ม slots_booked
--                           เฉพาะเมื่อ slots_booked < slots_max. ถ้า 0 แถวถูกอัปเดต
--                           = เต็ม → 'TRIP_FULL'.
--      จากนั้น insert booking. ถ้า insert ชนกฎ "หนึ่งทริปต่อวัน" จะได้ SQLSTATE
--      23505 (unique_violation) เด้งออกไปให้ client จัดการเหมือนเดิม และเพราะ
--      อยู่ใน transaction เดียว การจองที่นั่งจะถูก rollback อัตโนมัติ.
--
--    คืนค่า: UUID ของแถว tour_bookings ที่สร้างสำเร็จ.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_seat_and_book(
  p_tenant_id        UUID,
  p_tour_code        TEXT,
  p_client_id        UUID,
  p_amount_paid_aud  NUMERIC,
  p_reference_number TEXT,
  p_party_pax        INT,
  p_trip_size_tier   TEXT,
  p_pickup           TEXT,
  p_payment_method   TEXT,
  p_trip_date        DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tour       public.tours%ROWTYPE;
  v_updated    INT;
  v_booking_id UUID;
BEGIN
  -- ค้นหาทริปจากรหัส (tour_code) ภายใน tenant และ "ล็อกแถว" (FOR UPDATE)
  -- เพื่อให้สองคำขอจองพร้อมกันต้องเข้าคิวทีละราย (กันแข่งกันแย่งที่นั่งสุดท้าย).
  SELECT * INTO v_tour
  FROM public.tours
  WHERE tenant_id = p_tenant_id
    AND trip_code = p_tour_code
  FOR UPDATE;

  -- ───────── ด่าน 1: DATE GATE ─────────
  -- ไม่พบทริปในฐานข้อมูล หรือยังไม่กำหนดวันออกเดินทาง = "ยังไม่เปิดจอง".
  IF NOT FOUND OR v_tour.departure_start IS NULL THEN
    RAISE EXCEPTION 'TRIP_NOT_OPEN'
      USING ERRCODE = 'P0001',
            HINT = 'departure_start is NULL or tour not found';
  END IF;

  -- ───────── ด่าน 2: SEAT GATE (atomic) ─────────
  -- เพิ่ม slots_booked ทีละ 1 "ก็ต่อเมื่อ" ยังไม่เต็มเท่านั้น. การ UPDATE แบบมี
  -- เงื่อนไขนี้เป็น atomic ระดับแถว — เป็นไปไม่ได้ที่สองคำขอจะแย่งที่นั่งสุดท้าย
  -- ได้พร้อมกัน (อันที่สองจะอัปเดต 0 แถว). CHECK constraint เป็นด่านสำรองอีกชั้น.
  UPDATE public.tours
     SET slots_booked = slots_booked + 1
   WHERE id = v_tour.id
     AND (slots_max IS NULL OR slots_booked < slots_max);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'TRIP_FULL'
      USING ERRCODE = 'P0001',
            HINT = 'slots_booked has reached slots_max';
  END IF;

  -- สร้างแถวการจองใน transaction เดียวกัน. ถ้าขั้นนี้ล้มเหลว (เช่นชนกฎหนึ่งทริป
  -- ต่อวัน → 23505) ทั้ง transaction รวมถึง slots_booked += 1 จะถูก rollback.
  -- trip_date ใช้ค่าที่ลูกค้าเลือก (รองรับกฎหนึ่งทริปต่อวันเดิม); ถ้าไม่ส่งมาให้
  -- ใช้ departure_start ของทริปเป็นค่าเริ่มต้น (ผูกกับวันออกเดินทางจริง).
  INSERT INTO public.tour_bookings (
    tenant_id, tour_id, client_id, amount_paid_aud, status, payment_method,
    reference_number, party_pax, trip_size_tier, preferred_pickup,
    journey_phase, trip_date
  ) VALUES (
    p_tenant_id, v_tour.id, p_client_id, COALESCE(p_amount_paid_aud, 0), 'PENDING',
    p_payment_method, p_reference_number, p_party_pax, p_trip_size_tier, p_pickup,
    'book', COALESCE(p_trip_date, v_tour.departure_start)
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

-- อนุญาตให้ anon (PWA ใช้ public anon key) และ authenticated เรียกฟังก์ชันได้.
GRANT EXECUTE ON FUNCTION public.claim_seat_and_book(
  UUID, TEXT, UUID, NUMERIC, TEXT, INT, TEXT, TEXT, TEXT, DATE
) TO anon, authenticated;

-- ============================================================================
-- 5) (ทางเลือก) ฟังก์ชันคืนที่นั่งเมื่อยกเลิกการจอง — กัน slots_booked ค้างสูงเกินจริง.
--    เรียกได้ภายหลังเมื่อ booking ถูกยกเลิก. ไม่ให้ต่ำกว่า 0.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.release_trip_seat(
  p_tenant_id UUID,
  p_tour_code TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tours
     SET slots_booked = GREATEST(slots_booked - 1, 0)
   WHERE tenant_id = p_tenant_id
     AND trip_code = p_tour_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_trip_seat(UUID, TEXT) TO anon, authenticated;

-- ============================================================================
-- 6) ดัชนีช่วย lookup availability ตาม tour_code เร็วขึ้น (มี UNIQUE (tenant_id,
--    trip_code) อยู่แล้วจาก 01-schema; เพิ่ม index บน trip_code อย่างเดียวเผื่อ
--    query ที่ไม่ระบุ tenant).
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tours_trip_code ON public.tours (trip_code);

-- ============================================================================
-- 7) *** ขั้นตอน MANUAL ของเจ้าของ — ต้องทำเพื่อ "เปิดจอง" แต่ละทริป ***
--    ตั้งวันออกเดินทางจริง + ความจุ ให้ทริปที่ต้องการเปิดจอง. ตัวอย่าง
--    (แก้วันที่/ความจุตามจริง แล้วรันใน SQL Editor):
--
--    UPDATE public.tours SET departure_start = '2026-02-22',
--                            departure_end   = '2026-02-25',
--                            slots_max       = 5
--     WHERE trip_code = 'MEL-4D3N';
--
--    UPDATE public.tours SET departure_start = '2026-03-16',
--                            departure_end   = '2026-03-18',
--                            slots_max       = 6
--     WHERE trip_code = 'TAS-3D2N';
--
--    ทริปใดที่ departure_start ยังเป็น NULL จะ "ยังไม่เปิดจอง" โดยอัตโนมัติ
--    (ทั้งหน้าเว็บและฝั่ง DB จะปฏิเสธการจอง).
-- ============================================================================
