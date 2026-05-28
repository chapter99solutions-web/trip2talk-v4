import { Link } from 'react-router-dom';
import MeetTheCrew from '../components/public/MeetTheCrew';
import PublicBottomNav from '../components/public/PublicBottomNav';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80&auto=format';

export default function About() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased pb-20">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="font-serif text-xl font-semibold text-slate-900 tracking-tight">
            Trip2Talk
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/#tours" className="hover:text-emerald-600 transition-colors">
              Trips
            </Link>
            <Link to="/about" className="text-emerald-700">
              About
            </Link>
            <Link to="/contact" className="hover:text-emerald-600 transition-colors">
              Contact
            </Link>
            <Link to="/package-terms" className="hover:text-emerald-600 transition-colors">
              Terms
            </Link>
          </nav>
          <Link
            to="/"
            className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            ← Home
          </Link>
        </div>
      </header>

      {/* About intro */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/95 to-white" />
        <div className="relative max-w-3xl mx-auto px-4 py-16 md:py-24 text-center">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase">About</p>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl font-semibold text-slate-900 tracking-tight leading-tight">
            Private Photo Journeys,
            <br />
            <span className="text-slate-500 italic font-medium">personally led</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-slate-600 leading-relaxed max-w-xl mx-auto">
            Trip2Talk is Chapter 99 Photography&apos;s small-group travel studio — built for travellers who want
            beautiful light, calm pacing, and a finished album they are proud to keep.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
        <MeetTheCrew />
      </div>

      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-500">
          <div className="text-center md:text-left">
            <p className="font-serif text-lg font-semibold text-slate-900">Trip2Talk</p>
            <p className="mt-1">Chapter 99 Photography · Warrawee NSW</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-4 font-medium">
            <Link to="/terms" className="hover:text-teal">
              Photo terms
            </Link>
            <Link to="/package-terms" className="hover:text-teal">
              Package terms
            </Link>
          </nav>
        </div>
      </footer>

      <PublicBottomNav />
    </div>
  );
}
