import type { LucideIcon } from 'lucide-react';
import { BadgeCheck, Heart, Home, Users } from 'lucide-react';

type AudienceCard = {
  icon: LucideIcon;
  title: string;
  description: string;
  tags: string[];
  featured?: boolean;
  badge?: string;
};

const AUDIENCE_CARDS: AudienceCard[] = [
  {
    icon: Home,
    title: 'ครอบครัวจากไทยมาเยี่ยม',
    description:
      'พ่อแม่บินมาหาลูกที่ออส อยากเที่ยวกับ guide ภาษาไทย ไม่กล้าเที่ยวเอง พร้อมจ่ายแพงกว่าทุก segment',
    tags: ['ไม่ต่อราคา', 'refer ต่อวงกว้าง', 'Budget สูง'],
    featured: true,
    badge: 'แนะนำอันดับ 1',
  },
  {
    icon: BadgeCheck,
    title: 'PR / Permanent Resident ใหม่',
    description:
      'เพิ่งได้ PR อยากเที่ยวออสให้ครบก่อนชีวิตยุ่ง มีเงินมากกว่านักเรียน อยู่ออสนาน',
    tags: ['repeat ได้', 'อยู่ออสนาน'],
  },
  {
    icon: Heart,
    title: 'Couple ไทย-ออสซี่',
    description:
      'ฝ่ายไทยอยากพาฝ่ายออสซี่เที่ยว ต้องการ experience พิเศษ ภาพสวยสำหรับ social',
    tags: ['premium experience', 'ภาพสำหรับ social'],
  },
  {
    icon: Users,
    title: 'กลุ่มเพื่อนข้ามประเทศ',
    description:
      'คนไทยในออสชวนเพื่อนจากไทยมาเที่ยวด้วยกัน จอง group trip และ refer ในวงเพื่อน',
    tags: ['group booking', 'refer ในกลุ่มเพื่อน'],
  },
];

export default function TargetAudienceSection() {
  return (
    <section id="who-its-for" className="bg-white border-b border-slate-100 py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10 md:mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-2">
            Who this trip is for
          </p>
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-slate-900">
            ทริปนี้เหมาะกับใคร
          </h2>
          <p className="text-slate-500 mt-2 text-sm max-w-xl mx-auto">
            ออกแบบสำหรับคนไทยในออสเตรเลียที่อยากได้ guide ภาษาไทยและรูปสวยกลับบ้าน
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          {AUDIENCE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className={`relative rounded-2xl p-5 md:p-6 bg-white transition-shadow hover:shadow-md ${
                  card.featured
                    ? 'border-2 border-amber-400 shadow-sm shadow-amber-100/80 ring-1 ring-amber-200/60'
                    : 'border border-slate-200'
                }`}
              >
                {card.badge ? (
                  <span className="absolute top-4 right-4 inline-flex items-center px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 text-[10px] font-extrabold tracking-wide uppercase">
                    {card.badge}
                  </span>
                ) : null}

                <div
                  className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 ${
                    card.featured ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <Icon size={22} strokeWidth={1.75} aria-hidden />
                </div>

                <h3 className="font-serif text-lg font-semibold text-slate-900 pr-24">{card.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{card.description}</p>

                <ul className="flex flex-wrap gap-2 mt-4">
                  {card.tags.map((tag) => (
                    <li
                      key={tag}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        card.featured
                          ? 'bg-amber-50 text-amber-900 border border-amber-200/80'
                          : 'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
