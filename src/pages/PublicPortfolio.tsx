import { Link } from 'react-router-dom';
import PublicBottomNav from '../components/public/PublicBottomNav';
import MeetTheCrew from '../components/public/MeetTheCrew';
import TestimonialsSection from '../components/public/TestimonialsSection';
import PortfolioGallery from '../components/public/PortfolioGallery';
import LanguageToggle from '../components/i18n/LanguageToggle';
import { usePublicStrings } from '../lib/publicI18n';
import HeroSlideshowBackground from '../components/public/HeroSlideshowBackground';
import TargetAudienceSection from '../components/public/TargetAudienceSection';
import TripListingSection from '../components/trips/TripListingSection';
function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

const STATS = [
  { value: '8', label: 'Curated Trips' },
  { value: '100%', label: 'Small Group' },
  { value: 'Local', label: 'Photographers' },
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
    title: 'Thai Photographers',
    desc: 'Led by working photographers — not generic mass-market trip operators.',
    icon: '📷',
  },
  {
    title: 'Sustainable',
    desc: 'Small groups, low impact, and respectful wildlife practices.',
    icon: '🌿',
  },
];

export default function PublicPortfolio() {
  const t = usePublicStrings();
  const exploreHref = '/tours/TAS-3D2N';

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
            <Link to="/gallery" className="hover:text-emerald-600 transition-colors">
              Gallery
            </Link>
            <a href="#reviews" className="hover:text-emerald-600 transition-colors">
              Reviews
            </a>
            <Link to="/about" className="hover:text-emerald-600 transition-colors">
              About
            </Link>
            <Link to="/contact" className="hover:text-emerald-600 transition-colors">
              Contact
            </Link>
            <a href="#pricing" className="hover:text-emerald-600 transition-colors">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle />
            <Link
              to={exploreHref}
              className="px-4 py-2 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-colors shadow-sm"
            >
              Explore Now <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — image-first: minimal overlay, headline + bottom CTAs only */}
      <section className="relative min-h-[88vh] flex flex-col overflow-hidden bg-[#0d1b2a]">
        <HeroSlideshowBackground maxPhotos={20} />
        <div className="absolute inset-0 bg-black/30 z-[3]" aria-hidden />

        <p className="absolute top-5 left-4 md:top-6 md:left-8 z-10 flex items-center gap-1.5 text-[11px] md:text-xs text-white/80 font-medium">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400/90" />
          </span>
          <span className="italic">Now booking July 2026</span>
        </p>

        <div className="relative z-10 flex-1 flex items-center justify-center px-4 pt-14 pb-6">
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold leading-snug tracking-tight text-center text-white drop-shadow-md max-w-4xl">
            ประสบการณ์ถ่ายภาพระดับ premium สำหรับคนไทยในออสเตรเลีย
          </h1>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 pb-10 md:pb-14">
          <button
            type="button"
            onClick={() => scrollToSection('tours')}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-slate-900/90 text-white text-sm font-semibold tracking-wide shadow-lg shadow-black/25 hover:bg-slate-800 hover:-translate-y-0.5 transition-all duration-300 backdrop-blur-sm"
          >
            {t.view_all_trips}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('reviews')}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-white/50 bg-black/20 text-white text-sm font-semibold tracking-wide hover:bg-white/15 hover:border-white/70 transition-all duration-300 backdrop-blur-sm"
          >
            {t.read_reviews}
          </button>
        </div>
      </section>

      {/* Hero stats — below the photo, not on the overlay */}
      <section className="bg-white border-b border-slate-100 py-8 md:py-10">
        <div className="max-w-lg mx-auto px-4 grid grid-cols-3 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="font-serif text-2xl md:text-3xl font-semibold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <PortfolioGallery title={t.portfolio_gallery} />

      <TripListingSection />

      <TargetAudienceSection />

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

      {/* Meet the Crew — teaser */}
      <section className="max-w-6xl mx-auto px-4 py-20 md:py-28 border-t border-slate-100">
        <MeetTheCrew />
        <p className="text-center mt-12">
          <Link
            to="/about"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-emerald-700 transition-colors tracking-wide"
          >
            Full story on About <span aria-hidden>→</span>
          </Link>
        </p>
      </section>

      <TestimonialsSection />

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
            to="/tours/MEL-4D3N"
            className="px-6 py-3 rounded-full bg-white text-navy font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Explore trips <span aria-hidden>→</span>
          </Link>
          <Link
            to="/book/MEL-4D3N"
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
            <Link to="/portal" className="text-slate-400 hover:text-slate-600">
              Staff
            </Link>
          </nav>
        </div>
      </footer>

      <PublicBottomNav />
    </div>
  );
}
