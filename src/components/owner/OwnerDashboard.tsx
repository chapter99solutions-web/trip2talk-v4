import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CyberViewport from '../layout/CyberViewport';
import LiveClock from '../cyber/LiveClock';
import { fetchOwnerDashboardData, tourRevenue, type OwnerDashboardData } from '../../lib/supabaseData';

type OwnerTab = 'overview' | 'financial' | 'crm';

function formatAud(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

export default function OwnerDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<OwnerTab>('overview');
  const [data, setData] = useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchOwnerDashboardData());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const financial = useMemo(() => {
    if (!data) return null;
    const revenue = data.bookings.reduce((s, b) => s + b.amount_paid_aud, 0);
    const expenses = data.expenses.reduce((s, e) => s + e.amount_aud, 0);
    const gstClaimed = data.expenses.reduce((s, e) => s + (e.gst_amount_aud ?? 0), 0);
    const net = revenue - expenses;
    return { revenue, expenses, gstClaimed, net };
  }, [data]);

  const tripProfit = useMemo(() => {
    if (!data) return [];
    return data.tours
      .map((t) => {
        const rev = tourRevenue(t.id, data.bookings);
        const exp = data.expenses.filter((e) => e.tour_id === t.id).reduce((s, e) => s + e.amount_aud, 0);
        return { id: t.id, label: t.destination || t.trip_code, rev, exp, net: rev - exp };
      })
      .filter((r) => r.rev > 0 || r.exp > 0)
      .slice(0, 8);
  }, [data]);

  const handleSync = async (type: string) => {
    setSyncing(type);
    try {
      alert(`Use CMS → SAVE & SYNC for ${type}, or Owner Google sync in a future edge-function pass.`);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <CyberViewport className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-amber-400 font-semibold text-[22px] tracking-wide font-sans">OWNER DASHBOARD</h1>
            <p className="text-neutral-500 text-sm mt-1 tracking-wide font-sans">Trip2Talk · Owner HQ</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LiveClock />
            <Link to="/cms" className="cyber-btn-gold text-xs">
              CMS
            </Link>
            <Link to="/" className="cyber-btn-ghost text-xs">
              PUBLIC SITE
            </Link>
            <button type="button" onClick={onLogout} className="cyber-btn-exit">
              [ EXIT ]
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {(['overview', 'financial', 'crm'] as OwnerTab[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wide ${
                tab === id ? 'bg-amber-400 text-black' : 'bg-white/5 text-neutral-400 border border-white/10'
              }`}
            >
              {id}
            </button>
          ))}
        </div>

        {loading && <p className="text-neutral-500 text-sm">Loading…</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {tab === 'overview' && (
          <div className="cyber-card p-5">
            <p className="text-neutral-300 font-semibold">Owner console</p>
            <p className="mt-2 text-sm text-neutral-500">
              Use <span className="text-neutral-300 font-semibold">CMS</span> to create trips and register bookings (syncs to
              Google Sheets).
            </p>
          </div>
        )}

        {tab === 'financial' && financial && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="cyber-card p-4">
                <p className="text-xs text-neutral-500 uppercase">Gross revenue</p>
                <p className="text-xl font-semibold text-emerald-400 mt-1">{formatAud(financial.revenue)}</p>
              </div>
              <div className="cyber-card p-4">
                <p className="text-xs text-neutral-500 uppercase">Expenses</p>
                <p className="text-xl font-semibold text-rose-300 mt-1">{formatAud(financial.expenses)}</p>
              </div>
              <div className="cyber-card p-4">
                <p className="text-xs text-neutral-500 uppercase">GST claimable</p>
                <p className="text-xl font-semibold text-amber-300 mt-1">{formatAud(financial.gstClaimed)}</p>
              </div>
              <div className="cyber-card p-4">
                <p className="text-xs text-neutral-500 uppercase">Net profit</p>
                <p className="text-xl font-semibold text-white mt-1">{formatAud(financial.net)}</p>
              </div>
            </div>

            <div className="cyber-card p-5">
              <p className="text-sm font-semibold text-neutral-300 mb-4">Profit per trip</p>
              <div className="space-y-3">
                {tripProfit.length === 0 ? (
                  <p className="text-sm text-neutral-500">No trip P&amp;L data yet.</p>
                ) : (
                  tripProfit.map((row) => {
                    const max = Math.max(...tripProfit.map((r) => Math.abs(r.net)), 1);
                    const w = Math.round((Math.abs(row.net) / max) * 100);
                    return (
                      <div key={row.id}>
                        <div className="flex justify-between text-xs text-neutral-400 mb-1">
                          <span>{row.label}</span>
                          <span className={row.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {formatAud(row.net)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={`h-full ${row.net >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${w}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['expenses', 'revenue', 'full'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={Boolean(syncing)}
                  onClick={() => void handleSync(type)}
                  className="cyber-btn-gold text-xs"
                >
                  {syncing === type ? 'Syncing…' : `Sync ${type}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'crm' && (
          <div className="cyber-card p-5 space-y-4">
            <p className="text-sm text-neutral-400">
              CRM segments (Model / Photographer) sync from Supabase <code className="text-neutral-300">crm_clients</code> when
              connected. Use Google Sheets sync for broadcast lists.
            </p>
            <p className="text-sm text-neutral-500">{data?.bookings.length ?? 0} bookings on record.</p>
            <button
              type="button"
              disabled={Boolean(syncing)}
              onClick={() => void handleSync('clients')}
              className="cyber-btn-gold text-xs"
            >
              {syncing === 'clients' ? 'Syncing…' : 'Sync clients to Sheets'}
            </button>
            <a
              href="https://m.me/trip2talk.chapter99"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex cyber-btn-ghost text-xs"
            >
              Open Messenger broadcast
            </a>
          </div>
        )}
      </div>
    </CyberViewport>
  );
}
