import { Link } from 'react-router-dom';
import CyberViewport from '../components/layout/CyberViewport';
import LiveClock from '../components/cyber/LiveClock';
import InternalCmsDashboard from '../components/admin/InternalCmsDashboard';

export default function CmsPage({ onLogout }: { onLogout: () => void }) {
  return (
    <CyberViewport className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-amber-400 font-semibold text-[22px] tracking-wide font-sans">CMS</h1>
            <p className="text-neutral-500 text-sm mt-1 tracking-wide font-sans">
              Trips (Form 1) + Bookings (Form 2) → Google Sheets
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LiveClock />
            <Link to="/ops" className="cyber-btn-ghost text-xs">
              OPS
            </Link>
            <button type="button" onClick={onLogout} className="cyber-btn-exit">
              [ EXIT ]
            </button>
          </div>
        </header>

        <InternalCmsDashboard />
      </div>
    </CyberViewport>
  );
}

