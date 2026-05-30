import { Link } from 'react-router-dom';
import PublicBottomNav from '../components/public/PublicBottomNav';

const FACEBOOK_URL = 'https://www.facebook.com/TriptoTalk';

type CalendarTrip = {
  tourCode: string;
  name: string;
  nameTh: string;
  startDate: string | null;
  endDate: string | null;
  duration: string;
  price: number;
  spotsLeft: number;
  color: string;
  flexible?: boolean;
};

const TRIPS: CalendarTrip[] = [
  {
    tourCode: 'MEL-4D3N',
    name: 'Victoria Photo Trip',
    nameTh: 'เมลเบิร์น · Pink Lake · Twelve Apostles',
    startDate: '2026-02-22',
    endDate: '2026-02-25',
    duration: '4D3N',
    price: 1550,
    spotsLeft: 3,
    color: '#4ade80',
  },
  {
    tourCode: 'ULU-4D3N',
    name: 'The Red Desert Odyssey',
    nameTh: 'อุลูรู · Field of Light · Kata Tjuta',
    startDate: '2026-03-15',
    endDate: '2026-03-18',
    duration: '4D3N',
    price: 1690,
    spotsLeft: 2,
    color: '#f97316',
  },
  {
    tourCode: 'NZ-6D5N',
    name: 'The Alpine Kingdom',
    nameTh: 'นิวซีแลนด์เกาะใต้ · ออกทุกฤดูกาล',
    startDate: null,
    endDate: null,
    duration: '6D5N',
    price: 2350,
    spotsLeft: 5,
    color: '#60a5fa',
    flexible: true,
  },
];

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Format an ISO date range as e.g. "22–25 Feb 2026". Falls back gracefully. */
function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(`${startDate}T00:00:00`);
  const startDay = start.getDate();
  const startMonth = MONTHS_SHORT[start.getMonth()];
  const startYear = start.getFullYear();

  if (!endDate) {
    return `${startDay} ${startMonth} ${startYear}`;
  }

  const end = new Date(`${endDate}T00:00:00`);
  const endDay = end.getDate();
  const endMonth = MONTHS_SHORT[end.getMonth()];
  const endYear = end.getFullYear();

  if (startMonth === endMonth && startYear === endYear) {
    return `${startDay}–${endDay} ${endMonth} ${endYear}`;
  }
  if (startYear === endYear) {
    return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`;
  }
  return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString('en-AU')}`;
}

function TripCard({ trip }: { trip: CalendarTrip }) {
  const isFlexible = trip.flexible || !trip.startDate;

  return (
    <article className="relative flex overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
      {/* Color bar on the left */}
      <span
        aria-hidden
        className="w-1.5 shrink-0"
        style={{ backgroundColor: trip.color }}
      />

      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-lg font-semibold text-slate-900 leading-tight">
              {trip.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500 leading-snug">{trip.nameTh}</p>
          </div>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide"
            style={{
              backgroundColor: `${trip.color}1a`,
              color: trip.color,
            }}
          >
            {trip.duration}
          </span>
        </div>

        {/* Date range or flexible Facebook link */}
        <div className="mt-4">
          {isFlexible ? (
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 transition-colors"
            >
              📅 ติดตามวันเดินทางที่ Facebook
            </a>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <span aria-hidden>📅</span>
              {formatDateRange(trip.startDate as string, trip.endDate)}
            </p>
          )}
        </div>

        {/* Price + seats */}
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              เริ่มต้น / from
            </p>
            <p className="text-xl font-bold text-slate-900">
              from {formatPrice(trip.price)}
            </p>
          </div>
          <p className="text-sm font-semibold text-orange-600">
            🔥 เหลือ {trip.spotsLeft} ที่นั่ง
          </p>
        </div>

        {/* CTA */}
        <Link
          to={`/tours/${trip.tourCode}`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 active:scale-[0.98] transition"
        >
          ดูทริป →
        </Link>
      </div>
    </article>
  );
}

export default function Calendar() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased pb-24">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="font-serif text-xl font-semibold text-slate-900 tracking-tight">
            Trip2Talk
          </Link>
          <Link
            to="/"
            className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
            ตารางทริป 2026
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-500 leading-relaxed">
            อัปเดตวันเดินทางใหม่ที่{' '}
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              facebook.com/TriptoTalk
            </a>
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {TRIPS.map((trip) => (
            <TripCard key={trip.tourCode} trip={trip} />
          ))}
        </div>
      </main>

      <PublicBottomNav />
    </div>
  );
}
