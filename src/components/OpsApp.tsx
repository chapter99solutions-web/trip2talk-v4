import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PINGate from './PINGate';
import { AppRole } from '../types/platform';

const StaffDashboard = lazy(() => import('./staff/StaffDashboard'));
const CohostDashboard = lazy(() => import('./cohost/CohostDashboard'));
const OwnerDashboard = lazy(() => import('./owner/OwnerDashboard'));
const PlatformHub = lazy(() => import('./superadmin/PlatformHub'));

const IDLE_MS = 30 * 60 * 1000;

function RoleRouter({ role, onLogout }: { role: AppRole; onLogout: () => void }) {
  switch (role) {
    case 'STAFF':
      return <StaffDashboard onLogout={onLogout} />;
    case 'COHOST':
      return <CohostDashboard onLogout={onLogout} />;
    case 'OWNER':
      return <OwnerDashboard onLogout={onLogout} />;
    case 'PLATFORM_ADMIN':
      return <PlatformHub onLogout={onLogout} />;
    default:
      return null;
  }
}

/** Staff / owner consoles behind PIN (/dashboard). */
export default function OpsApp() {
  const [currentRole, setCurrentRole] = useState<AppRole | null>(null);

  const logout = useCallback(() => {
    setCurrentRole(null);
  }, []);

  useEffect(() => {
    if (!currentRole) return;

    let idleTimer = window.setTimeout(logout, IDLE_MS);

    const resetIdle = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(logout, IDLE_MS);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;
    events.forEach((ev) => window.addEventListener(ev, resetIdle, { passive: true }));

    return () => {
      window.clearTimeout(idleTimer);
      events.forEach((ev) => window.removeEventListener(ev, resetIdle));
    };
  }, [currentRole, logout]);

  if (currentRole === null) {
    return (
      <div className="relative">
        <Link
          to="/"
          className="absolute top-4 left-4 z-50 text-xs font-mono text-neutral-500 hover:text-[color:var(--teal)]"
        >
          ← Public site
        </Link>
        <PINGate onAuthenticated={setCurrentRole} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-neutral-950">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <RoleRouter role={currentRole} onLogout={logout} />
      </Suspense>
    </div>
  );
}
