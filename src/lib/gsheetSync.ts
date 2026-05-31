/**
 * gsheetSync.ts — ส่งข้อมูลการจอง (booking) ตรงไปยัง Google Apps Script Web App
 * เพื่อ append แถวลงชีต 'Bookings'.
 *
 * ทำไมต้องมีไฟล์นี้ (root cause ของบั๊กเดิม):
 *   เส้นทางเดิม (src/lib/gasSync.ts → syncBookingToSheets) ส่งผ่าน Supabase Edge
 *   Function ชื่อ `sync-booking-to-sheets` ซึ่งไม่ได้ deploy / ล้มเหลวเงียบ ๆ
 *   ผลลัพธ์ที่ fail ถูกเก็บไว้แค่ใน `warnings` แล้ว console.warn เท่านั้น —
 *   เบราว์เซอร์ไม่เคย POST ตรงไปยัง GAS Web App เลย แถวจึงไม่เคยถูกเพิ่ม.
 *
 *   ไฟล์นี้ POST ตรงไปยัง GAS เลียนแบบ pattern ของ receipts (src/lib/receipts.ts)
 *   ที่ทำงานได้จริง: ใช้ Content-Type text/plain + redirect follow + log ทุกขั้นตอน.
 */

/**
 * URL สำรองแบบ hardcode (ตรงกับ DEFAULT_GAS_WEBAPP_URL ใน tripsSheetApi.ts /
 * receipts.ts) — ใช้เมื่อไม่มี env var ตอน build (เช่น dev ที่ไม่มีไฟล์ .env)
 * เพื่อให้แอปยังคุยกับ Apps Script backend ที่ deploy ไว้ได้.
 */
const DEFAULT_GAS_WEBAPP_URL =
  'https://script.google.com/macros/s/AKfycby_BjSu7zQnPqpBnoYpbELs8_nPFnj44VD-xNFNLVvN328hmfobwSp78wRxdeCtg9rNXg/exec';

/**
 * ลำดับการเลือก URL (precedence):
 *   1. VITE_GSHEET_WEBAPP_URL  ← env var ใหม่ตามที่ task ระบุ (ลองก่อน)
 *   2. VITE_GAS_WEBAPP_URL     ← env var เดิมที่โปรเจกต์ใช้อยู่ (trips/receipts)
 *   3. DEFAULT_GAS_WEBAPP_URL  ← ค่า fallback แบบ hardcode
 * หมายเหตุ: import.meta.env.* เป็น string | undefined จึงต้อง guard ก่อน trim.
 */
function resolveGSheetUrl(): string {
  const fromNew = (import.meta.env.VITE_GSHEET_WEBAPP_URL as string | undefined)?.trim();
  const fromOld = (import.meta.env.VITE_GAS_WEBAPP_URL as string | undefined)?.trim();
  return fromNew || fromOld || DEFAULT_GAS_WEBAPP_URL;
}

/** prefix สำหรับ log ทุกบรรทัด — ค้นใน console ได้ง่าย */
const LOG = '[GSheetSync]';

/** ฟิลด์ของ payload ที่ส่งไป append เป็นแถวในชีต 'Bookings' */
export type BookingSheetPayload = {
  /** บังคับให้ GAS doPost route ไปยัง branch addBooking */
  action?: 'addBooking';
  /** เลขอ้างอิงการจองที่ลูกค้าเห็น เช่น T2T-XXXX */
  booking_ref?: string;
  /** UUID ของแถวใน Supabase (tour_bookings.id) */
  booking_id?: string;
  /** ชื่อลูกค้า */
  client_name?: string;
  email?: string;
  phone?: string;
  /** รหัสทัวร์ เช่น KIA-1DAY */
  tour_code?: string;
  /** วันเดินทาง (YYYY-MM-DD) */
  departure_date?: string;
  /** ยอดเงิน (มัดจำ/รวม) เป็น AUD */
  amount?: number;
  /** จำนวนผู้เดินทาง */
  pax?: number;
  /** จุดรับ */
  pickup?: string;
  /** สถานะการจอง เช่น PENDING */
  status?: string;
  /** หมายเหตุเพิ่มเติม */
  notes?: string;
  /** เวลาที่สร้าง (ISO) */
  created_at?: string;
};

/** ผลลัพธ์ของการ sync — ไม่เคย throw, คืนค่าเสมอ */
export type GSheetSyncResult = {
  success: boolean;
  /** response ที่ parse แล้วจาก GAS (ถ้ามี) */
  response?: unknown;
  error?: string;
};

/**
 * ส่งข้อมูลการจองไป append ลงชีต 'Bookings' ผ่าน GAS Web App.
 *
 * ออกแบบให้ "ไม่บล็อก" ผู้ใช้: ทุก error จะถูก catch + log ภายในแล้ว resolve
 * (ไม่ throw ออกไปทำให้ flow การจองพัง) — เพราะ Supabase เป็น source of truth
 * และตอนเรียกฟังก์ชันนี้ booking ถูกบันทึกลง Supabase สำเร็จแล้ว.
 * แต่ failure จะถูก "log ไว้เสมอ" (console.error) — ไม่ซ่อนเงียบเหมือนของเดิม.
 */
export async function syncBookingToSheet(
  payload: BookingSheetPayload
): Promise<GSheetSyncResult> {
  const url = resolveGSheetUrl();
  // ผูก action: 'addBooking' เสมอ เผื่อ caller ไม่ได้ส่งมา
  const body = JSON.stringify({ action: 'addBooking', ...payload });

  console.log(`${LOG} start →`, { url, payload });

  try {
    const res = await fetch(url, {
      method: 'POST',
      // สำคัญ: ต้องเป็น text/plain — ไม่ใช่ application/json
      // เพราะ application/json จะ trigger CORS preflight (OPTIONS) ที่ Apps Script
      // ไม่รองรับ ทำให้ล้มเหลวเงียบ ๆ. doPost จะอ่าน e.postData.contents เอง.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      // สำคัญ: Apps Script ตอบ 302 redirect ไป script.googleusercontent.com
      // ต้อง follow ไม่งั้นจะอ่าน response ไม่ได้.
      redirect: 'follow',
    });

    // พยายาม parse เป็น JSON ก่อน ถ้าไม่ได้ก็เก็บเป็น text ดิบ
    const raw = await res.text();
    let parsed: unknown = raw;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // GAS อาจตอบ HTML/ข้อความ — เก็บ raw text ไว้ log
    }

    if (!res.ok) {
      console.error(`${LOG} HTTP error`, { status: res.status, body: raw.slice(0, 1000) });
      return { success: false, response: parsed, error: `HTTP ${res.status}` };
    }

    // ตรวจ error ที่ GAS ส่งกลับมาในรูป { status: 'error', message }
    if (parsed && typeof parsed === 'object') {
      const o = parsed as Record<string, unknown>;
      if (o.status === 'error' || o.success === false) {
        const msg = String(o.message ?? o.error ?? 'GAS returned an error');
        console.error(`${LOG} GAS error response`, { response: parsed });
        return { success: false, response: parsed, error: msg };
      }
    }

    console.log(`${LOG} success ✓`, { response: parsed });
    return { success: true, response: parsed };
  } catch (e) {
    // network error / abort / ฯลฯ — log แต่ไม่ throw
    const error = e instanceof Error ? e.message : String(e);
    console.error(`${LOG} failed (non-blocking)`, { error, payload });
    return { success: false, error };
  }
}

/**
 * ทดสอบ endpoint แบบแยกเดี่ยวจาก console ของเบราว์เซอร์.
 * เรียกได้ด้วย:  window.testGSheetSync()
 * จะส่ง payload จองทดสอบที่ติดป้ายชัดเจน (TEST-...) แล้ว log ผลเต็ม ๆ.
 */
export async function testGSheetSync(): Promise<GSheetSyncResult> {
  const ref = `TEST-${Date.now()}`;
  console.log(`${LOG} testGSheetSync → กำลังส่ง booking ทดสอบ`, { booking_ref: ref });
  const result = await syncBookingToSheet({
    action: 'addBooking',
    booking_ref: ref,
    booking_id: ref,
    client_name: 'TEST — gsheetSync console',
    email: 'test@trip2talk.com.au',
    phone: '+61400000000',
    tour_code: 'TEST-1DAY',
    departure_date: new Date().toISOString().slice(0, 10),
    amount: 1,
    pax: 1,
    pickup: 'test_pickup',
    status: 'TEST',
    notes: 'Manual console test — ลบแถวนี้ได้',
    created_at: new Date().toISOString(),
  });
  console.log(`${LOG} testGSheetSync result:`, result);
  return result;
}

// แนบ testGSheetSync ไว้ที่ window เพื่อเรียกจาก console ได้ทันที (ทั้ง dev/prod).
// ใช้ try/catch กัน SSR / สภาพแวดล้อมที่ไม่มี window.
try {
  if (typeof window !== 'undefined') {
    (window as unknown as { testGSheetSync?: typeof testGSheetSync }).testGSheetSync =
      testGSheetSync;
  }
} catch {
  // ignore — environment without window
}
