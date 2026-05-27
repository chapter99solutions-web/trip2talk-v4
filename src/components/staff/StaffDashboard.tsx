import { useState, useEffect, useCallback, useMemo } from 'react';
import { CRMClient, Tour } from '../../types/tour';
import { validateOSHC } from '../../lib/compliance';
import {
  fetchStaffDashboardData,
  ACTIVE_TOUR_STATUSES,
  BookingWithRelations,
  StaffDashboardData,
} from '../../lib/supabaseData';
import CyberViewport from '../layout/CyberViewport';
import AwaitingSync from '../cyber/AwaitingSync';
import { IconAlertTriangle } from '../icons/IconAlertTriangle';
import { IconFirstAid } from '../icons/IconFirstAid';
import VisaBadge from '../cyber/VisaBadge';
import TierBadge from '../cyber/TierBadge';
import WaiverModule from '../waiver/WaiverModule';
import { fetchSignedClientIds } from '../../lib/waiverApi';
import { getLocalWaiversByClientIds } from '../../lib/waiverDb';
import { WaiverData } from '../../types/compliance';

interface CriticalAlert {
  id: string;
  clientName: string;
  detail: string;
}

interface WarningAlert {
  id: string;
  clientName: string;
  detail: string;
  type: 'medical' | 'dietary';
}

function clientLabel(c: CRMClient): string {
  return `${c.first_name_en} ${c.last_name_en}`;
}

function oshcStatusLabel(client: CRMClient, tour: Tour): { text: string; tone: 'ok' | 'warn' | 'crit' } {
  const v = validateOSHC(client, tour);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(client.oshc_expiry);
  if (expiry < today) return { text: 'EXPIRED', tone: 'crit' };
  if (!v.is_valid) return { text: v.warnings[0] ?? 'INVALID', tone: 'warn' };
  return { text: `${v.days_remaining}D OK`, tone: 'ok' };
}

export default function StaffDashboard({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [signedClientIds, setSignedClientIds] = useState<Set<string>>(new Set());
  const [waiverSession, setWaiverSession] = useState<{
    client: CRMClient;
    tour: Tour;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStaffDashboardData();
      setData(result);
      setSynced(true);
      setError(null);

      const clientIds = [
        ...new Set(
          result.bookings
            .map((b) => b.crm_clients?.id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      try {
        const remoteSigned = await fetchSignedClientIds(clientIds);
        const localWaivers = await getLocalWaiversByClientIds(clientIds);
        const merged = new Set(remoteSigned);
        localWaivers.forEach((w) => merged.add(w.client_id));
        setSignedClientIds(merged);
      } catch (waiverErr) {
        console.warn('[Trip2Talk] Waiver status load failed:', waiverErr);
        const localWaivers = await getLocalWaiversByClientIds(clientIds);
        setSignedClientIds(new Set(localWaivers.map((w) => w.client_id)));
      }
    } catch (err) {
      setData(null);
      setSynced(false);
      const msg = err instanceof Error ? err.message : 'CONNECTION LOST';
      setError(msg);
      console.error('[Trip2Talk] StaffDashboard sync failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const update = () =>
      setDateStr(
        new Date().toLocaleDateString('en-AU', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      );
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);

  const activeBookings = useMemo(() => {
    if (!synced || !data) return [];
    return data.bookings.filter(
      (b) => b.tours && ACTIVE_TOUR_STATUSES.includes(b.tours.status) && b.crm_clients
    );
  }, [synced, data]);

  const { criticalAlerts, warningAlerts } = useMemo(() => {
    const critical: CriticalAlert[] = [];
    const warning: WarningAlert[] = [];

    activeBookings.forEach((b) => {
      const client = b.crm_clients!;
      const tour = b.tours!;
      const name = clientLabel(client);
      const oshc = validateOSHC(client, tour);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(client.oshc_expiry);

      if (expiry < today) {
        critical.push({
          id: `exp-${client.id}`,
          clientName: name,
          detail: `OSHC expired ${client.oshc_expiry}`,
        });
      } else if (!oshc.is_valid) {
        critical.push({
          id: `pre-${client.id}`,
          clientName: name,
          detail: oshc.warnings.join(' · '),
        });
      }

      if (client.medical_conditions.trim()) {
        warning.push({
          id: `med-${client.id}`,
          clientName: name,
          detail: client.medical_conditions,
          type: 'medical',
        });
      }
      if (client.dietary_requirements.trim() && client.dietary_requirements.toLowerCase() !== 'none') {
        warning.push({
          id: `diet-${client.id}`,
          clientName: name,
          detail: client.dietary_requirements,
          type: 'dietary',
        });
      }
    });

    return { criticalAlerts: critical, warningAlerts: warning };
  }, [activeBookings]);

  if (loading) {
    return (
      <CyberViewport className="flex items-center justify-center p-6">
        <p className="text-amber-400 cyber-sync-dots">
          SYNCING DATABASE
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </p>
      </CyberViewport>
    );
  }

  const handleWaiverComplete = (_waiver: WaiverData) => {
    if (waiverSession) {
      setSignedClientIds((prev) => new Set(prev).add(waiverSession.client.id));
    }
    setWaiverSession(null);
    load();
  };

  return (
    <CyberViewport className="p-6">
      {waiverSession && (
        <WaiverModule
          client={waiverSession.client}
          tour={waiverSession.tour}
          onComplete={handleWaiverComplete}
          onCancel={() => setWaiverSession(null)}
        />
      )}
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-amber-400 font-semibold text-[22px] tracking-wide font-sans">STAFF OPERATIONS</h1>
            <p className="font-mono text-sm text-neutral-500 mt-1 tracking-wide">{dateStr}</p>
          </div>
          <button type="button" onClick={onLogout} className="cyber-btn-exit">
            [ EXIT ]
          </button>
        </header>

        {error && (
          <div className="cyber-card p-4 flex flex-wrap justify-between items-center gap-3 border-red-500/30">
            <span className="font-sans text-sm font-medium text-red-400 tracking-wide">CONNECTION LOST — {error}</span>
            <button type="button" onClick={load} className="cyber-btn-ghost">
              RETRY SYNC
            </button>
          </div>
        )}

        {!synced ? (
          <AwaitingSync />
        ) : (
        <>
        <section className="space-y-3">
          <h2 className="cyber-section-header text-red-400 tracking-wide uppercase">
            Critical Safety Briefing
          </h2>
          {criticalAlerts.length === 0 ? (
            <div className="cyber-card p-4 cyber-table-td text-neutral-500 text-sm">NO CRITICAL ALERTS</div>
          ) : (
            criticalAlerts.map((a) => (
              <div
                key={a.id}
                className="cyber-card cyber-alert-critical p-4 flex gap-3 items-start"
              >
                <IconAlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="cyber-alert-text font-semibold text-red-400">{a.clientName}</p>
                  <p className="cyber-alert-text text-neutral-400 mt-1">{a.detail}</p>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="cyber-section-header tracking-wide uppercase" style={{ color: 'var(--neon-orange)' }}>
            Warnings — Medical & Dietary
          </h2>
          {warningAlerts.length === 0 ? (
            <div className="cyber-card p-4 cyber-table-td text-neutral-500 text-sm">NO WARNINGS</div>
          ) : (
            warningAlerts.map((a) => (
              <div
                key={a.id}
                className="cyber-card cyber-alert-warning p-4 flex gap-3 items-start"
              >
                <IconFirstAid className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="cyber-alert-text font-semibold text-orange-400">{a.clientName}</p>
                  <p className="font-sans text-sm text-neutral-500 uppercase tracking-wide mt-0.5">
                    {a.type === 'medical' ? 'Medical' : 'Dietary'}
                  </p>
                  <p className="cyber-alert-text text-neutral-400 mt-1">{a.detail}</p>
                </div>
              </div>
            ))
          )}
        </section>

        <div className="cyber-card overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="cyber-section-header text-amber-400 tracking-wide">TOUR MANIFEST</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="p-3 cyber-table-th text-neutral-500 tracking-wide">NAME</th>
                  <th className="p-3 cyber-table-th text-neutral-500 tracking-wide">PASSPORT</th>
                  <th className="p-3 cyber-table-th text-neutral-500 tracking-wide">VISA</th>
                  <th className="p-3 cyber-table-th text-neutral-500 tracking-wide">OSHC</th>
                  <th className="p-3 cyber-table-th text-neutral-500 tracking-wide">MEDICAL</th>
                  <th className="p-3 cyber-table-th text-neutral-500 tracking-wide">TIER</th>
                  <th className="p-3 cyber-table-th text-neutral-500 tracking-wide">PICKUP</th>
                  <th className="p-3 cyber-table-th text-neutral-500 tracking-wide">WAIVER</th>
                </tr>
              </thead>
              <tbody>
                {activeBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 cyber-table-td text-neutral-500 text-sm text-center">
                      NO MANIFEST ENTRIES
                    </td>
                  </tr>
                ) : (
                  activeBookings.map((b: BookingWithRelations) => {
                    const c = b.crm_clients!;
                    const t = b.tours!;
                    const oshc = oshcStatusLabel(c, t);
                    const pickupLocation = (b as unknown as { pickup_location?: string | null; preferred_pickup?: string | null })
                      .pickup_location ?? (b as unknown as { preferred_pickup?: string | null }).preferred_pickup;
                    return (
                      <tr key={b.id} className="cyber-table-row border-b border-white/5">
                        <td className="p-3">
                          <p className="cyber-table-td font-medium">
                            {c.first_name_en} {c.last_name_en}
                          </p>
                          <p className="font-sans text-sm text-neutral-500">
                            {c.first_name_th} {c.last_name_th}
                          </p>
                          <p className="font-mono text-sm text-amber-500/70 mt-0.5">{t.trip_code}</p>
                        </td>
                        <td className="p-3 cyber-table-td font-mono">{c.passport_number}</td>
                        <td className="p-3">
                          <VisaBadge status={c.visa_status} />
                        </td>
                        <td className="p-3">
                          <span
                            className={`font-mono text-sm ${
                              oshc.tone === 'crit'
                                ? 'text-red-400'
                                : oshc.tone === 'warn'
                                  ? 'text-orange-400'
                                  : 'text-emerald-400'
                            }`}
                          >
                            {oshc.text}
                          </span>
                        </td>
                        <td className="p-3 cyber-table-td text-sm text-neutral-400 max-w-[140px]">
                          {c.medical_conditions || '—'}
                        </td>
                        <td className="p-3">
                          <TierBadge tier={c.client_tier} />
                        </td>
                        <td className="p-3 cyber-table-td text-sm text-neutral-300">
                          {pickupLocation === 'custom_accommodation' ? '🏨' : '📍'}
                        </td>
                        <td className="p-3">
                          {signedClientIds.has(c.id) ? (
                            <span className="font-mono text-xs text-emerald-400 font-semibold tracking-wide">
                              ✓ SIGNED
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setWaiverSession({ client: c, tour: t })}
                              className="px-3 py-1.5 rounded-lg font-mono text-xs font-semibold bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-colors"
                            >
                              SIGN WAIVER
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </div>
    </CyberViewport>
  );
}
