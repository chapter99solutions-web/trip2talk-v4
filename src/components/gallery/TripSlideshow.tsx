import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

// ====================================================================
// TripSlideshow — สไลด์โชว์ออโต้เพลย์ที่ใช้ซ้ำได้
// ดึงรูปสดจากโฟลเดอร์ใน Supabase Storage (รองรับชื่อโฟลเดอร์ที่มีช่องว่าง
// และโฟลเดอร์ซ้อน เช่น "Tasmania 02/Hobart")
// ====================================================================

type TripSlideshowProps = {
  /** ชื่อ bucket ใน Supabase Storage เช่น "portfolio" */
  bucket: string;
  /** path ของโฟลเดอร์ อาจมีช่องว่าง/ซ้อนกัน เช่น "Tasmania 02/Hobart" */
  folder: string;
  /** ระยะเวลาเลื่อนสไลด์อัตโนมัติ (ms) ค่าเริ่มต้น 4000ms */
  intervalMs?: number;
};

// นามสกุลไฟล์รูปที่อนุญาต (เช็คแบบไม่สนตัวพิมพ์เล็ก/ใหญ่)
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/**
 * เรียงชื่อไฟล์แบบ "natural sort" เพื่อให้ได้ลำดับ 1,2,3,...,10,11
 * แทนที่จะเป็นแบบ lexicographic (1,10,11,2)
 * ใช้ localeCompare พร้อม { numeric: true }
 */
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export default function TripSlideshow({
  bucket,
  folder,
  intervalMs = 4000,
}: TripSlideshowProps) {
  // รายการ URL ของรูปที่จะแสดง
  const [images, setImages] = useState<string[]>([]);
  // กำลังโหลด list() อยู่หรือไม่ — ใช้แสดง skeleton
  const [loading, setLoading] = useState(true);
  // index ของสไลด์ปัจจุบัน
  const [current, setCurrent] = useState(0);
  // หยุดออโต้เพลย์ชั่วคราว (เมื่อ hover/แตะ)
  const [paused, setPaused] = useState(false);

  // ----------------------------------------------------------------
  // โหลดรายชื่อไฟล์จาก Supabase Storage เมื่อ bucket/folder เปลี่ยน
  // ----------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function loadImages() {
      // ส่ง path ของโฟลเดอร์ซ้อน (ที่มีช่องว่าง) เป็น prefix ให้ list() ตรง ๆ
      // Supabase list() รับ path prefix แบบ "Tasmania 02/Hobart" ได้เลย
      const { data, error } = await supabase.storage.from(bucket).list(folder, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' },
      });

      // ถ้า error หรือไม่มีไฟล์ → ไม่แสดงอะไรเลย (return null ด้านล่าง)
      if (cancelled) return;
      if (error || !data?.length) {
        setImages([]);
        setLoading(false);
        return;
      }

      const urls = data
        // กรองเฉพาะไฟล์รูปจริง (มี id/metadata) และไม่ใช่ entry placeholder ของโฟลเดอร์
        .filter((f) => {
          const isPlaceholder = !f.id && !f.metadata; // โฟลเดอร์ย่อย/placeholder
          return !isPlaceholder && IMAGE_EXT.test(f.name);
        })
        // เรียงชื่อไฟล์แบบ natural sort ก่อนสร้าง URL
        .sort((a, b) => naturalSort(a.name, b.name))
        .map((f) => {
          // สร้าง full object path เช่น "Tasmania 02/Hobart/1.jpg"
          // *** สำคัญ: ส่ง path เต็มให้ getPublicUrl แล้วปล่อยให้ client encode เอง
          // ห้าม encodeURIComponent ซ้ำ ไม่งั้นช่องว่างจะกลายเป็น %2520 (double-encode)
          // ช่องว่างจะถูกแปลงเป็น %20 เพียงครั้งเดียวอย่างถูกต้อง ***
          const path = `${folder}/${f.name}`;
          return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
        });

      setImages(urls);
      setLoading(false);
    }

    void loadImages();
    return () => {
      cancelled = true;
    };
  }, [bucket, folder]);

  // รีเซ็ตสไลด์ไปที่รูปแรกทุกครั้งที่ชุดรูปเปลี่ยน
  useEffect(() => {
    setCurrent(0);
  }, [images.length]);

  // ----------------------------------------------------------------
  // ออโต้เพลย์ — เลื่อนไปรูปถัดไปทุก ๆ intervalMs (หยุดเมื่อ paused)
  // ----------------------------------------------------------------
  useEffect(() => {
    if (paused || images.length < 2) return;
    const id = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [paused, images.length, intervalMs]);

  // ไปสไลด์ก่อนหน้า (วนรอบ)
  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // ไปสไลด์ถัดไป (วนรอบ)
  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % images.length);
  }, [images.length]);

  // ใช้ ref ป้องกัน touchstart/touchend ยิงซ้ำกับ mouse event บนบางอุปกรณ์
  const touching = useRef(false);

  // ----------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------

  // ระหว่างโหลด list() → แสดง skeleton
  if (loading) {
    return (
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-slate-200 animate-pulse" />
    );
  }

  // โฟลเดอร์ว่าง หรือ list() error → ไม่แสดงอะไรเลย (ไม่มีกล่องว่าง/พัง)
  if (!images.length) return null;

  return (
    <div
      className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-slate-900 shadow-xl shadow-black/10 select-none"
      // หยุดออโต้เพลย์เมื่อเมาส์ชี้ค้าง แล้วเล่นต่อเมื่อเมาส์ออก
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // หยุดออโต้เพลย์เมื่อแตะหน้าจอ แล้วเล่นต่อเมื่อปล่อยนิ้ว
      onTouchStart={() => {
        touching.current = true;
        setPaused(true);
      }}
      onTouchEnd={() => {
        touching.current = false;
        setPaused(false);
      }}
    >
      {/* รูปทั้งหมดซ้อนทับกัน แล้วใช้ opacity ทำ fade transition */}
      {images.map((src, idx) => (
        <img
          key={src}
          src={src}
          alt=""
          // โหลดรูปแบบ lazy + decode แบบ async เพื่อประสิทธิภาพบนมือถือ
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
          style={{ opacity: idx === current ? 1 : 0 }}
        />
      ))}

      {/* ไล่เฉดดำด้านล่างให้ลูกศร/จุดอ่านง่ายขึ้น */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 pointer-events-none" />

      {/* ปุ่มลูกศร ก่อนหน้า/ถัดไป (แสดงเมื่อมีมากกว่า 1 รูป) */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full bg-white/85 hover:bg-white text-slate-900 shadow-md transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full bg-white/85 hover:bg-white text-slate-900 shadow-md transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* จุดบอกตำแหน่ง (dots) — คลิกเพื่อกระโดดไปสไลด์นั้น */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to slide ${idx + 1}`}
                onClick={() => setCurrent(idx)}
                className={`rounded-full transition-all ${
                  idx === current
                    ? 'w-6 h-2 bg-white'
                    : 'w-2 h-2 bg-white/55 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
