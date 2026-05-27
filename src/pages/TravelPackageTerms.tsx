import { Link } from 'react-router-dom';
import BookingPolicyPanel from '../components/policy/BookingPolicyPanel';

export default function TravelPackageTerms() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-serif text-2xl text-[color:var(--gold)]">Travel package terms</h1>
      <p className="text-neutral-400 text-sm mt-1">Task 13 · Private Photo Journey (not a commercial tour operator)</p>

      <div className="mt-6">
        <BookingPolicyPanel compact />
      </div>

      <section className="cyber-card p-5 mt-6 text-sm text-neutral-300 space-y-2">
        <p>
          Trip2Talk operates curated <strong>Private Photo Journeys</strong> for small groups. This is not a
          mass-market commercial tour product.
        </p>
        <p className="text-neutral-500 text-xs">
          ไทย: บริการนี้เป็นทริปถ่ายภาพแบบส่วนตัว ไม่ใช่ผู้ประกอบการนำเที่ยวเชิงพาณิชย์ทั่วไป
        </p>
      </section>

      <p className="text-xs text-neutral-500 mt-6">
        <Link to="/" className="text-[color:var(--teal)]">← Home</Link>
        {' · '}
        <Link to="/terms" className="text-[color:var(--teal)]">
          Photo delivery terms
        </Link>
      </p>
    </article>
  );
}
