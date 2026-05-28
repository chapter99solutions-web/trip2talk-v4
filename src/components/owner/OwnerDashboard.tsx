import { Link } from 'react-router-dom';
import InternalCmsDashboard from '../admin/InternalCmsDashboard';
import CyberViewport from '../layout/CyberViewport';
import LiveClock from '../cyber/LiveClock';

/** Owner console (PIN 9999): trip + booking CMS with Google Sheets sync. */
export default function OwnerDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <CyberViewport className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-amber-400 font-semibold text-[22px] tracking-wide font-sans">OWNER CMS</h1>
            <p className="text-neutral-500 text-sm mt-1 tracking-wide font-sans">
              Trip2Talk · Trips &amp; bookings → Google Sheets
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LiveClock />
            <Link to="/" className="cyber-btn-ghost text-xs">
              PUBLIC SITE
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
