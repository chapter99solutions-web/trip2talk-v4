import { useCallback, useEffect, useRef, useState } from 'react';

export type Testimonial = {
  name: string;
  tripTag: string;
  stars: number;
  quote: string;
};

const REVIEWS: Testimonial[] = [
  {
    name: 'คุณเมย์',
    tripTag: 'Sydney One Day · Influencer Package',
    stars: 5,
    quote:
      'ปกติเป็นคนโพสท่าไม่เป็นเลย ถ่ายรูปทีไรเกร็งตลอด แต่มาทริปกับพี่แสนคือหมดห่วง! พี่แสนคอยบอกมุม คอยจัดท่าทางให้แบบเป็นกันเองมาก พาไปมุมลับที่คนโลคอลยังไม่ค่อยรู้ แถมแต่งโทนสีรูปออกมาละมุนนีสไตล์อินฟลูสุดๆ คุ้มค่ามากค่ะ ไม่ต้องเหนื่อยขับรถเองเลย แนะนำเลยค่ะ!',
  },
  {
    name: 'คุณบอย & คุณแพร',
    tripTag: 'Melbourne 4D3N · Twelve Apostles',
    stars: 5,
    quote:
      'เปิดโลกมากครับ! ทริปนี้ไม่ใช่ทัวร์ชะโงกทั่วไป แต่คือ Photo Trip ของจริง พี่แสนพาไปดักรอแสงเย็นช่วง Golden Hour และตื่นมาเก็บแสงเช้า Blue Hour ฟินสุดคือคืนที่สองฟ้าเปิด ได้ถ่ายภาพคู่กับทางช้างเผือก (Milky Way) สดๆ เหนือทะเลสาบสีชมพู อลังการจนลืมหายใจ ขอบคุณทีมงาน Trip2Talk และ Chapter 99 สำหรับความทรงจำและมิตรภาพดีๆ ในห้องพัก Dorm Setup สนุกเหมือนไปเที่ยวกับกลุ่มเพื่อนสนิทเลยครับ',
  },
  {
    name: 'คุณเคท',
    tripTag: 'NZ South Island · Autumn Road Trip',
    stars: 5,
    quote:
      'ตัดสินใจถูกมากที่มานิวซีแลนด์เกาะใต้ช่วงใบไม้เปลี่ยนสีกับ Trip2Talk บรรยากาศโรแมนติกมากกก ช่างภาพทำการบ้านมาดีมาก รู้ไลน์พยากรณ์แสง รู้มุมที่จอดรถแล้วถ่ายเห็นยอดเขาสะท้อนน้ำแบบ Unseen ถ่ายรูปและคลิปโดรนให้แบบจัดเต็มไม่มีกั๊ก ส่วนเรื่องอาหารและที่พักแนว Budget ก็ยืดหยุ่นดีมาก ได้เลือกกินของที่ชอบชิลๆ แอดมินพลอยก็น่ารักคอยซัพพอร์ตตอบคำถามและเตรียมน้ำดื่มให้ตลอดทาง เลิฟมากค่ะ!',
  },
  {
    name: 'คุณตั้ม',
    tripTag: 'Tasmania · Mini Aurora Hunt',
    stars: 5,
    quote:
      'ภารกิจตามล่าแสงออโรร่า (Aurora Hunt) สำเร็จเพราะความมืออาชีพของทีมงานเลยครับ พี่แสนตรวจค่าพลังงานแสงใต้และสภาพอากาศแบบเรียลไทม์ พาขึ้นยอดเขา Mt. Wellington ตอนมืดๆ สองคืนติด สอนวิธีตั้งค่ากล้องถ่ายดาวถ่ายแสงใต้แบบ step-by-step จนคนใช้กล้องไม่ค่อยเป็นแบบผมได้รูปแสงใต้เต้นระบำกลับมาอวดเพื่อนในเฟสบุ๊ค บ้าคลั่งมากครับ ทริปหน้าเจอกันอีกแน่นอน!',
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 text-amber-400" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="text-lg leading-none" aria-hidden>
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewCard({ item, active }: { item: Testimonial; active?: boolean }) {
  return (
    <blockquote
      className={`h-full flex flex-col rounded-[24px] border border-slate-100 bg-white p-6 md:p-8 shadow-sm transition-all duration-300 ease-out ${
        active ? 'md:hover:shadow-xl md:hover:-translate-y-1' : 'opacity-90 scale-[0.98]'
      }`}
    >
      <Stars count={item.stars} />
      <p className="mt-5 flex-1 text-[15px] md:text-base text-slate-600 leading-[1.75]">&ldquo;{item.quote}&rdquo;</p>
      <footer className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="font-semibold text-slate-900">{item.name}</p>
        <span className="inline-flex w-fit items-center rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {item.tripTag}
        </span>
      </footer>
    </blockquote>
  );
}

export default function TestimonialsSection() {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);

  const count = REVIEWS.length;

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => (i + dir + count) % count);
    },
    [count]
  );

  useEffect(() => {
    const el = trackRef.current;
    if (!el || window.matchMedia('(min-width: 768px)').matches) return;
    const card = el.children[index] as HTMLElement | undefined;
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [index]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => {
      const cards = Array.from(el.children) as HTMLElement[];
      if (!cards.length) return;
      const center = el.scrollLeft + el.clientWidth / 2;
      let nearest = 0;
      let minDist = Infinity;
      cards.forEach((card, i) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(center - cardCenter);
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      });
      setIndex(nearest);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    const end = e.changedTouches[0]?.clientX ?? touchStart.current;
    const delta = end - touchStart.current;
    if (Math.abs(delta) > 48) go(delta < 0 ? 1 : -1);
    touchStart.current = null;
  };

  return (
    <section id="reviews" className="relative py-20 md:py-28 bg-[#FAFAF9] border-y border-slate-100 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-14">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase">Reviews</p>
          <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
            ความประทับใจจากเพื่อนร่วมทาง
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">What Our Guests Say</p>
          <p className="mt-5 text-sm md:text-base text-slate-600 leading-relaxed">
            ไม่ใช่แค่คำชม แต่คือความทรงจำอันล้ำค่าที่พวกเราได้ออกไปบันทึกร่วมกัน — ฟังเสียงตอบรับจากลูกทริปตัวจริงของ Trip2Talk
            ที่การันตีความฟินและไฟล์ภาพระดับพรีเมียมกลับบ้านเต็มกระเป๋า
          </p>
        </div>

        {/* Desktop: slider with arrows */}
        <div className="hidden md:block relative">
          <div className="overflow-hidden rounded-[28px]">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {REVIEWS.map((item) => (
                <div key={item.name} className="w-full shrink-0 px-1">
                  <ReviewCard item={item} active />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mt-8">
            <div className="flex gap-2">
              {REVIEWS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to review ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === index ? 'w-8 bg-emerald-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                className="w-11 h-11 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-900 hover:text-white transition-colors duration-300"
                aria-label="Previous review"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="w-11 h-11 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-900 hover:text-white transition-colors duration-300"
                aria-label="Next review"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Mobile: card stack + horizontal snap swipe */}
        <div className="md:hidden relative">
          <div
            className="absolute inset-x-6 top-3 h-full rounded-[24px] bg-white/60 border border-slate-100 shadow-sm -z-10 translate-y-2 scale-[0.97]"
            aria-hidden
          />
          <div
            className="absolute inset-x-3 top-1.5 h-full rounded-[24px] bg-white/80 border border-slate-100 shadow-sm -z-10 translate-y-1 scale-[0.985]"
            aria-hidden
          />

          <div
            ref={trackRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {REVIEWS.map((item, i) => (
              <div key={item.name} className="w-[88vw] max-w-md shrink-0 snap-center">
                <ReviewCard item={item} active={i === index} />
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {REVIEWS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to review ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index ? 'w-8 bg-emerald-600' : 'w-2 bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
