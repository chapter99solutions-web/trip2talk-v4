import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatAUD } from '../lib/payidCalc';
import { PORTFOLIO_TOURS, TOUR_FILTERS, TourFilter } from '../lib/portfolioTours';
import PublicBottomNav from '../components/public/PublicBottomNav';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=85';

const STATS = [
  { value: '400+', label: 'Destinations' },
  { value: '98%', label: 'Satisfaction' },
  { value: '120+', label: 'Guides' },
];

const FEATURES = [
  {
    title: 'Custom Itinerary',
    desc: 'Every Private Photo Journey is shaped around your group, light, and story.',
    icon: '✦',
  },
  {
    title: 'Visa & OSHC',
    desc: 'Compliance-ready support for international student travellers.',
    icon: '🛂',
  },
  {
    title: 'Expert Guides',
    desc: 'Led by working photographers — not generic mass-market trip operators.',
    icon: '📷',
  },
  {
    title: 'Sustainable',
    desc: 'Small groups, low impact, and respectful wildlife practices.',
    icon: '🌿',
  },
];

const GUIDES = [
  { name: 'แสน', nameEn: 'Saen', role: 'Founder · Lead Photographer', trips: 186, rating: 4.9, gradient: 'from-emerald-400 to-teal-600' },
  { name: 'พลอย', nameEn: 'Ploy', role: 'Co-Host · Client Experience', trips: 94, rating: 4.8, gradient: 'from-rose-300 to-amber-400' },
  { name: 'James', nameEn: 'James', role: 'Wildlife Specialist', trips: 72, rating: 4.9, gradient: 'from-sky-400 to-indigo-500' },
  { name: 'Lena', nameEn: 'Lena', role: 'City & Editorial', trips: 58, rating: 4.7, gradient: 'from-violet-400 to-fuchsia-500' },
];

const TESTIMONIALS = [
  { quote: 'The album felt like a magazine spread — every frame intentional.', name: 'M.K.', stars: 5 },
  { quote: 'Small group, no rush. Saen found light we would never have seen.', name: 'P.S.', stars: 5 },
  { quote: 'OSHC and waiver handled smoothly. Parents were reassured.', name: 'A.L.', stars: 5 },
];

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm tracking-tight" aria-label={`${rating} stars`}>
      {'★'.repeat(Math.floor(rating))}
      {rating % 1 >= 0.5 ? '½' : ''}
      <span className="text-slate-400 ml-1 text-xs font-sans font-medium">{rating}</span>
    </span>
  );
}

function TourCard({
  tour,
  saved,
  onToggleSave,
  large,
}: {
  tour: (typeof PORTFOLIO_TOURS)[0];
  saved: boolean;
  onToggleSave: () => void;
  large?: boolean;
}) {
  return (
    <article
      className={`group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-shadow ${
        large ? 'lg:col-span-2' : ''
      }`}
    >
      <div className={`relative overflow-hidden ${large ? 'aspect-[21/9]' : 'aspect-video'}`}>
        <img
          src={tour.image}
          alt={tour.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleSave();
          }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-lg shadow-sm hover:scale-110 transition-transform"
          aria-label={saved ? 'Unsave' : 'Save'}
        >
          {saved ? '❤️' : '🤍'}
        </button>
        {tour.featured && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            Featured
          </span>
        )}
      </div>
      <div className="p-4 md:p-5">
        <div className="flex justify-between items-start gap-2">
          <div>
            <StarRow rating={tour.rating} />
            <h3 className={`font-serif font-semibold text-slate-900 mt-1 ${large ? 'text-2xl' : 'text-lg'}`}>
              {tour.title}
            </h3>
          </div>
          <p className="font-semibold text-teal whitespace-nowrap">{formatAUD(tour.priceAud)}</p>
        </div>
        <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
          <span aria-hidden>📍</span> {tour.location} · {tour.duration}
        </p>
        <p className="text-xs text-slate-400 mt-1">{tour.reviewCount} reviews</p>
        <Link
          to={`/tours/${tour.id}`}
          className="mt-4 inline-flex w-full justify-center items-center gap-2 py-2.5 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-colors"
        >
          Book this trip <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}

export default function PublicPortfolio() {
  const [filter, setFilter] = useState<TourFilter>('all');
  const [saved, setSaved] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    if (filter === 'all') return PORTFOLIO_TOURS;
    return PORTFOLIO_TOURS.filter((t) => t.category === filter);
  }, [filter]);

  const toggleSave = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased pb-20">
      {/* Sticky nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="font-serif text-xl font-semibold text-slate-900 tracking-tight">
            Trip2Talk
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#tours" className="hover:text-emerald-600 transition-colors">
              Trips
            </a>
            <a href="#gallery" className="hover:text-emerald-600 transition-colors">
              Gallery
            </a>
            <a href="#guides" className="hover:text-emerald-600 transition-colors">
              Guides
            </a>
            <a href="#pricing" className="hover:text-emerald-600 transition-colors">
              Pricing
            </a>
          </nav>
          <Link
            to="/tours/nz-aut-2026"
            className="shrink-0 px-4 py-2 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-colors shadow-sm"
          >
            Explore Now <span aria-hidden>→</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
          <p className="flex items-center justify-center gap-2 text-sm font-medium mb-6">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span className="text-emerald-300 italic font-medium">Now booking Summer 2025</span>
          </p>
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-semibold leading-tight tracking-tight">
            Capture the World,
            <br />
            <span className="text-emerald-300 italic font-medium">One Journey</span>
          </h1>
          <p className="mt-6 text-lg text-white/80 max-w-xl mx-auto">
            Private Photo Journeys for small groups — curated light, finished .JPG galleries, Chapter 99 Photography.
          </p>
          <div className="mt-8 flex justify-center">
            <a
              href="#tours"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-navy font-semibold text-sm hover:bg-slate-50 transition-colors shadow-sm"
            >
              Explore Now <span aria-hidden>→</span>
            </a>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg mx-auto border-t border-white/20 pt-8">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-serif text-2xl md:text-3xl font-semibold">{s.value}</p>
                <p className="text-xs text-white/70 mt-1 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tours */}
      <section id="tours" className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-slate-900">Curated journeys</h2>
          <p className="text-slate-500 mt-2 text-sm">Tier 1 Standard (4–6) · Tier 2 Private (1–3) Guaranteed Departure</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {TOUR_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f.id
                  ? 'bg-navy text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label === 'One Day' ? 'One Day Trip' : f.label}
            </button>
          ))}
        </div>
        <div id="gallery" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              saved={saved.has(tour.id)}
              onToggleSave={() => toggleSave(tour.id)}
              large={tour.featured && filter === 'all'}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-slate-500 py-12">No trips in this category yet.</p>
        )}
      </section>

      {/* Features */}
      <section className="bg-slate-50 border-y border-slate-100 py-20">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="text-center md:text-left">
              <span className="text-2xl">{f.icon}</span>
              <h3 className="font-serif text-lg font-semibold text-slate-900 mt-3">{f.title}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Guides */}
      <section id="guides" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="font-serif text-3xl font-semibold text-center text-slate-900 mb-12">Meet your guides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {GUIDES.map((g) => (
            <div
              key={g.nameEn}
              className="rounded-2xl border border-slate-100 p-6 text-center shadow-sm hover:shadow-md transition-shadow bg-white"
            >
              <div
                className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${g.gradient} flex items-center justify-center text-white font-serif text-2xl font-semibold shadow-inner`}
              >
                {g.nameEn.charAt(0)}
              </div>
              <h3 className="font-serif text-lg font-semibold mt-4">
                {g.name} <span className="text-slate-400 text-sm font-sans">({g.nameEn})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">{g.role}</p>
              <p className="text-sm text-slate-700 mt-3 font-medium">
                {g.trips} trips · ★ {g.rating}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <blockquote
              key={t.name}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"
            >
              <p className="text-amber-400 text-sm mb-3">{'★'.repeat(t.stars)}</p>
              <p className="text-slate-600 italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-4 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-semibold">
                  {t.name}
                </span>
                <span className="text-sm font-medium text-slate-700">Verified guest</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="font-serif text-2xl font-semibold text-slate-900">Simple pricing</h2>
        <div className="mt-8 grid sm:grid-cols-2 gap-4 text-left">
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase text-emerald-600">Tier 1 Standard</p>
            <p className="font-serif text-xl mt-2">4–6 guests</p>
            <p className="text-sm text-slate-500 mt-1">List price per person</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
            <p className="text-xs font-semibold uppercase text-emerald-700">Tier 2 Private</p>
            <p className="font-serif text-xl mt-2">1–3 guests</p>
            <p className="text-sm text-slate-500 mt-1">Guaranteed Departure · premium rate</p>
          </div>
        </div>
        <Link to="/package-terms" className="inline-block mt-6 text-sm text-emerald-600 hover:underline">
          View package & cancellation terms →
        </Link>
      </section>

      {/* CTA */}
      <section className="mx-4 mb-20 rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white py-16 px-6 text-center">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold max-w-xl mx-auto">
          Ready to frame your next chapter?
        </h2>
        <p className="mt-4 text-emerald-100/90 text-sm max-w-md mx-auto">
          Private Photo Journeys from Warrawee — not a mass-market escorted travel service (บริการนำเที่ยวทั่วไป).
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/tours/nz-aut-2026"
            className="px-6 py-3 rounded-full bg-white text-navy font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Explore trips <span aria-hidden>→</span>
          </Link>
          <Link
            to="/book/nz-aut-2026"
            className="px-6 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
          >
            Book this trip <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-500">
          <div className="text-center md:text-left">
            <p className="font-serif text-lg font-semibold text-slate-900">Trip2Talk</p>
            <p className="mt-1">Chapter 99 Photography</p>
            <p className="mt-1">ABN: XX XXX XXX XXX · Warrawee NSW 2074</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-4 font-medium" aria-label="Legal">
            <Link to="/terms" className="hover:text-teal">
              Photo delivery terms
            </Link>
            <Link to="/package-terms" className="hover:text-teal">
              Package &amp; cancellation terms
            </Link>
            <Link to="/dashboard" className="text-slate-400 hover:text-slate-600">
              Staff
            </Link>
          </nav>
        </div>
      </footer>

      <PublicBottomNav />
    </div>
  );
}
