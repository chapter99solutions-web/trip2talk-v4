import { useCallback, useEffect, useState } from 'react';
import CyberViewport from '../layout/CyberViewport';
import LiveClock from '../cyber/LiveClock';
import AwaitingSync from '../cyber/AwaitingSync';
import { fetchOwnerDashboardData, OwnerDashboardData } from '../../lib/supabaseData';
import { supabase } from '../../lib/supabase';

export default function PlatformHub({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<OwnerDashboardData | null>(null);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectRef, setProjectRef] = useState<string>('—');

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchOwnerDashboardData();
      setData(result);
      setSynced(true);
    } catch (err) {
      setData(null);
      setSynced(false);
      setError(err instanceof Error ? err.message : 'CONNECTION LOST');
    }
  }, []);

  useEffect(() => {
    load();
    const url = import.meta.env.VITE_SUPABASE_URL ?? '';
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match) setProjectRef(match[1]);
  }, [load]);

  const activeTrips =
    data?.tours.filter((t) => t.status === 'CONFIRMED' || t.status === 'ACTIVE').length ?? 0;

  return (
    <CyberViewport className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-[color:var(--gold)] font-serif font-semibold text-[22px] tracking-wide">
              PLATFORM HUB
            </h1>
            <p className="text-neutral-400 text-sm mt-1 font-sans">
              Trip2Talk V4 · Platform Admin
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <LiveClock />
            <button type="button" onClick={onLogout} className="cyber-btn-exit">
              [ EXIT ]
            </button>
          </div>
        </header>

        {error && (
          <div className="cyber-card p-4 flex flex-wrap justify-between items-center gap-3 border-red-500/30">
            <span className="font-sans text-sm text-red-400">{error}</span>
            <button type="button" onClick={load} className="cyber-btn-ghost">
              RETRY
            </button>
          </div>
        )}

        {!synced ? (
          <AwaitingSync />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="cyber-card p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wide font-sans">Active trips</p>
              <p className="text-3xl font-semibold text-[color:var(--teal)] mt-2">{activeTrips}</p>
            </div>
            <div className="cyber-card p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wide font-sans">Bookings</p>
              <p className="text-3xl font-semibold text-[color:var(--teal)] mt-2">
                {data?.bookings.length ?? 0}
              </p>
            </div>
            <div className="cyber-card p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wide font-sans">CRM clients</p>
              <p className="text-3xl font-semibold text-[color:var(--gold)] mt-2">—</p>
              <p className="text-[11px] text-neutral-500 mt-1">Use Staff / Co-Host for client ops</p>
            </div>
            <div className="cyber-card p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wide font-sans">Supabase project</p>
              <p className="font-mono text-sm text-neutral-200 mt-2 break-all">{projectRef}</p>
              <p className="text-[11px] text-neutral-500 mt-2">
                {supabase ? 'Client connected' : 'Not configured'}
              </p>
            </div>
          </div>
        )}

        <div className="cyber-card p-5 space-y-3 text-sm text-neutral-400 font-sans">
          <p className="text-neutral-200 font-semibold">Edge functions</p>
          <ul className="list-disc list-inside space-y-1 font-mono text-xs">
            <li>record-waiver</li>
            <li>send-trip-receipt</li>
            <li>google-workspace-sync</li>
          </ul>
          <p className="text-[11px] text-neutral-500 pt-2">
            Tables unchanged: <span className="text-neutral-300">tours</span>,{' '}
            <span className="text-neutral-300">tour_bookings</span>
          </p>
        </div>
      </div>
    </CyberViewport>
  );
}
