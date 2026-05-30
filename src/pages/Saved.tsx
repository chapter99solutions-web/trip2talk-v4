import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicBottomNav from '../components/public/PublicBottomNav';
import TourCard from '../components/public/TourCard';
import { mergeTripsWithFallback } from '../data/tours';
import { fetchTripsFromSheet, TripSheetRow } from '../lib/tripsSheetApi';
import { useSavedTrips } from '../hooks/useSavedTrips';

export default function Saved() {
  const { saved, toggle: toggleSave } = useSavedTrips();
  const [trips, setTrips] = useState<TripSheetRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const rows = await fetchTripsFromSheet();
        if (!cancelled) setTrips(mergeTripsWithFallback(rows));
      } catch {
        if (!cancelled) setTrips(mergeTripsWithFallback([]));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const savedTrips = useMemo(
    () => trips.filter((trip) => saved.has(trip.tourCode)),
    [trips, saved]
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased pb-24">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="font-serif text-xl font-semibold text-slate-900 tracking-tight">
            Trip2Talk
          </Link>
          <Link
            to="/trips"
            className="px-4 py-2 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-colors shadow-sm"
          >
            ดูทริปทั้งหมด <span aria-hidden>→</span>
          </Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-slate-900">
            ทริปที่บันทึกไว้
          </h1>
          <p className="text-slate-500 mt-2 text-sm">Saved trips</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 h-[360px] animate-pulse" />
            ))}
          </div>
        ) : savedTrips.length === 0 ? (
          <div className="max-w-xl mx-auto text-center py-16">
            <p className="text-slate-700 font-semibold text-lg">ยังไม่มีทริปที่บันทึกไว้</p>
            <p className="text-sm text-slate-500 mt-2">
              แตะไอคอน Bookmark บนการ์ดทริปเพื่อบันทึกทริปที่คุณสนใจ
            </p>
            <Link
              to="/trips"
              className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-colors shadow-sm"
            >
              ดูทริปทั้งหมด <span aria-hidden>→</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedTrips.map((tour) => (
              <TourCard
                key={tour.tourCode}
                tour={tour}
                saved={saved.has(tour.tourCode)}
                onToggleSave={() => toggleSave(tour.tourCode)}
              />
            ))}
          </div>
        )}
      </section>

      <PublicBottomNav />
    </div>
  );
}
