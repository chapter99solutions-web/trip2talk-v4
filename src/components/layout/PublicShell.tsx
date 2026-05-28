import { Link, Outlet } from 'react-router-dom';
import PublicBottomNav from '../public/PublicBottomNav';

/** Light sub-page chrome (tour detail, checkout, terms). Home has its own layout. */
export default function PublicShell() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-20">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-serif text-lg font-semibold text-slate-900">
            Trip2Talk
          </Link>
          <div className="flex gap-3 text-sm">
            <Link to="/" className="text-emerald-600 hover:underline">
              ← Home
            </Link>
            <Link to="/ops" className="text-slate-500 hover:text-slate-800">
              Ops
            </Link>
          </div>
        </div>
      </header>
      <Outlet />
      <PublicBottomNav />
    </div>
  );
}
