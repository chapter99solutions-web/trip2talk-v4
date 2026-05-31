-- 17-schema-staff-seat-adjust.sql
-- Trip2Talk V4 — ปุ่ม +/− จัดการที่นั่งของ "พนักงาน" (Co-Host Terminal) แบบ ATOMIC.
--
-- รันไฟล์นี้ใน Supabase SQL Editor (ต้องรัน 16-schema-seat-limit-date-gate.sql ก่อน
-- เพราะใช้คอลัมน์ slots_booked / slots_max / departure_start + CHECK constraint เดิม).
-- ปลอดภัยต่อการรันซ้ำ (CREATE OR REPLACE).
--
-- แนวคิด:
--   * พนักงานเป็นผู้ใช้ที่ไว้ใจได้ → กด "+" เพื่อรับ walk-in ทันที (ไม่ต้องผ่าน
--     ขั้นชำระเงิน) แต่ "ต้องไม่เกินความจุ" (slots_max) เด็ดขาด.
--   * ใช้ slots_booked "คอลัมน์เดียวกัน" กับ claim_seat_and_book (ฝั่งลูกค้าออนไลน์)
--     → ดังนั้นที่นั่งของพนักงาน + ลูกค้าออนไลน์ รวมกันแล้วจะไม่มีทางเกิน slots_max.
--   * "+1" ใช้ conditional UPDATE แบบ atomic — สองคนกดที่นั่งสุดท้ายพร้อมกัน
--     จะสำเร็จได้แค่คนเดียว (อีกคนอัปเดต 0 แถว → 'TRIP_FULL').
--   * CHECK constraint tours_slots_within_capacity เป็นด่านสำรองสุดท้าย.

-- ============================================================================
-- staff_adjust_seat(p_tenant_id, p_tour_code, p_delta)
--   p_delta > 0 : เพิ่มที่นั่ง (atomic, ห้ามเกิน slots_max, ต้องมี departure_start)
--   p_delta < 0 : คืนที่นั่ง (ไม่ให้ต่ำกว่า 0)
--   คืนค่า: slots_booked ใหม่หลังปรับ.
--   error: 'TRIP_NOT_OPEN' (ไม่พบทริป/ยังไม่กำหนดวันออกเดินทาง), 'TRIP_FULL' (เต็ม)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.staff_adjust_seat(
  p_tenant_id UUID,
  p_tour_code TEXT,
  p_delta     INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tour    public.tours%ROWTYPE;
  v_updated INT;
  v_new     INT;
BEGIN
  IF p_delta = 0 THEN
    RAISE EXCEPTION 'INVALID_DELTA' USING ERRCODE = 'P0001';
  END IF;

  -- ล็อกแถวทริปก่อน เพื่อให้การกดพร้อมกันเข้าคิวทีละราย (กันแย่งที่นั่งสุดท้าย).
  SELECT * INTO v_tour
  FROM public.tours
  WHERE tenant_id = p_tenant_id AND trip_code = p_tour_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRIP_NOT_OPEN'
      USING ERRCODE = 'P0001', HINT = 'tour not found for tenant/trip_code';
  END IF;

  IF p_delta > 0 THEN
    -- ด่านวันเดินทาง (DATE GATE): ทริปที่ยังไม่มี departure_start = ยังไม่เปิดจอง.
    IF v_tour.departure_start IS NULL THEN
      RAISE EXCEPTION 'TRIP_NOT_OPEN'
        USING ERRCODE = 'P0001', HINT = 'departure_start is NULL';
    END IF;

    -- ด่านที่นั่ง (SEAT GATE): เพิ่มแบบ atomic — สำเร็จเฉพาะเมื่อไม่ทำให้เกิน slots_max.
    UPDATE public.tours
       SET slots_booked = slots_booked + p_delta
     WHERE id = v_tour.id
       AND (slots_max IS NULL OR slots_booked + p_delta <= slots_max)
    RETURNING slots_booked INTO v_new;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      RAISE EXCEPTION 'TRIP_FULL'
        USING ERRCODE = 'P0001', HINT = 'slots_booked would exceed slots_max';
    END IF;
  ELSE
    -- คืนที่นั่ง: ไม่ให้ slots_booked ต่ำกว่า 0 (เหมือน release_trip_seat).
    UPDATE public.tours
       SET slots_booked = GREATEST(slots_booked + p_delta, 0)
     WHERE id = v_tour.id
    RETURNING slots_booked INTO v_new;
  END IF;

  RETURN v_new;
END;
$$;

-- อนุญาตให้ anon (Co-Host Terminal ใช้ public anon key; PIN auth ฝั่ง client) เรียกได้.
GRANT EXECUTE ON FUNCTION public.staff_adjust_seat(UUID, TEXT, INT) TO anon, authenticated;
