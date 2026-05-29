import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CyberViewport from '../layout/CyberViewport';
import LiveClock from '../cyber/LiveClock';
import FBInboxTrigger from './FBInboxTrigger';
import { MARGIN_TABLE } from '../../lib/bookingRules';
import { syncBookingToSheets } from '../../lib/gasSync';
import { fetchOwnerDashboardData, tourRevenue, type OwnerDashboardData } from '../../lib/supabaseData';

type OwnerTab = 'overview' | 'financial' | 'crm';
type Lang = 'TH' | 'EN';

function formatAud(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

export default function OwnerDashboard({ onLogout }: { onLogout: () => void }) {
  const [lang, setLang] = useState<Lang>(() =>
    localStorage.getItem('trip2talk_language') === 'EN' ? 'EN' : 'TH'
  );
  const [tab, setTab] = useState<OwnerTab>('overview');
  const [data, setData] = useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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
    const net = revenue - expenses;
    return { revenue, expenses, net };
  }, [data]);

  const upcoming = useMemo(() => {
    if (!data) return [];
    return data.tours.slice(0, 8).map((t) => {
      const pax = t.current_pax ?? 0;
      return {
        id: t.id,
        title: `Secret Journey · ${t.trip_code}`,
        date: t.start_date,
        pax,
        greenlit: pax >= 6,
        showUpgrade: pax === 4,
      };
    });
  }, [data]);

  const handleSheetsSync = async () => {
    if (!data?.bookings.length) return;
    setSyncing(true);
    try {
      const b = data.bookings[0];
      const res = await syncBookingToSheets({
        booking_id: b.id,
        client_name: 'Owner sync',
        email: '',
        phone: '',
        pax_count: (b as { party_pax?: number }).party_pax ?? 1,
        trip_date: new Date().toISOString().slice(0, 10),
        payment_status: b.status,
      });
      if (!res.success) throw new Error(res.error);
      alert(lang === 'TH' ? 'ซิงก์ Sheets สำเร็จ' : 'Sheets sync OK');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <CyberViewport className="p-4 sm:p-6 bg-navy min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-gold font-serif text-2xl font-semibold tracking-wide">
              {lang === 'TH' ? 'แดชบอร์ดเจ้าของ' : 'OWNER DASHBOARD'}
            </h1>
            <p className="text-neutral-400 text-sm mt-1">Trip2Talk · Owner HQ</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setLang(lang === 'TH' ? 'EN' : 'TH')}
              className="text-xs px-3 py-1 rounded-full border border-white/20 text-neutral-300"
            >
              {lang === 'TH' ? 'EN' : 'ไทย'}
            </button>
            <LiveClock />
            <Link to="/cms" className="cyber-btn-gold text-xs">
              CMS
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
                tab === id ? 'bg-gold text-navy' : 'bg-white/5 text-neutral-400 border border-white/10'
              }`}
            >
              {id}
            </button>
          ))}
        </div>

        {loading && <p className="text-neutral-500 text-sm">{lang === 'TH' ? 'กำลังโหลด…' : 'Loading…'}</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {tab === 'overview' && financial && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="cyber-card p-4 border border-teal/30">
                <p className="text-xs text-neutral-500 uppercase">
                  {lang === 'TH' ? 'รายได้เดือนนี้' : 'Revenue this month'}
                </p>
                <p className="text-2xl font-semibold text-teal mt-1">{formatAud(financial.revenue)}</p>
              </div>
              <div className="cyber-card p-4 border border-gold/30">
                <p className="text-xs text-neutral-500 uppercase">
                  {lang === 'TH' ? 'กำไรสุทธิ' : 'Net margin'}
                </p>
                <p className="text-2xl font-semibold text-gold mt-1">{formatAud(financial.net)}</p>
              </div>
            </div>

            <div className="cyber-card p-5">
              <p className="text-sm font-semibold text-neutral-200 mb-3">
                {lang === 'TH' ? 'ทริปที่กำลังจะมาถึง' : 'Upcoming trips'}
              </p>
              <ul className="space-y-2">
                {upcoming.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap justify-between gap-2 text-sm border-b border-white/5 pb-2"
                  >
                    <span className="text-neutral-300">{t.title}</span>
                    <span className="text-neutral-500">{t.date}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        t.greenlit ? 'bg-teal/20 text-teal' : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {t.pax} pax {t.greenlit ? '✓' : '< 6'}
                    </span>
                    {t.showUpgrade && (
                      <button type="button" className="cyber-btn-gold text-xs">
                        {lang === 'TH'
                          ? 'ส่งใบแจ้งอัปเกรด +$130/คน'
                          : 'Send Upgrade Invoice +$130/head'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <FBInboxTrigger
              customerName="Khun Demo"
              albumUrl="https://trip2talk.com.au/album/demo"
              expiryDate="2026-08-01"
              lang={lang}
            />
          </div>
        )}

        {tab === 'financial' && (
          <div className="space-y-4">
            <div className="cyber-card p-5 overflow-x-auto">
              <p className="text-sm font-semibold text-gold mb-3">
                {lang === 'TH' ? 'ตารางมาร์จิ้น (สเปก)' : 'Margin table (spec)'}
              </p>
              <table className="w-full text-xs text-left">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="py-2">{lang === 'TH' ? 'ประเภท' : 'Type'}</th>
                    <th>Rev</th>
                    <th>Cohost</th>
                    <th>Van</th>
                    <th>Photo</th>
                    <th>Snacks</th>
                    <th>NET</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-300">
                  {[MARGIN_TABLE.shared8, MARGIN_TABLE.private4].map((row) => (
                    <tr key={row.label.en} className="border-t border-white/10">
                      <td className="py-2">{lang === 'TH' ? row.label.th : row.label.en}</td>
                      <td>{formatAud(row.revenue)}</td>
                      <td>-{formatAud(row.cohost)}</td>
                      <td>-{formatAud(row.van)}</td>
                      <td>-{formatAud(row.photographer)}</td>
                      <td>-{formatAud(row.snacks)}</td>
                      <td className="text-teal font-semibold">+{formatAud(row.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              disabled={syncing}
              onClick={() => void handleSheetsSync()}
              className="cyber-btn-gold text-xs"
            >
              {syncing
                ? lang === 'TH'
                  ? 'กำลังซิงก์…'
                  : 'Syncing…'
                : lang === 'TH'
                  ? 'ซิงก์ Google Sheets'
                  : 'Sync Google Sheets'}
            </button>
          </div>
        )}

        {tab === 'crm' && (
          <div className="cyber-card p-5">
            <p className="text-sm text-neutral-400">
              {lang === 'TH' ? 'ลูกค้า CRM + compliance hash' : 'CRM + compliance hash audit'}
            </p>
            <p className="text-neutral-500 text-sm mt-2">{data?.bookings.length ?? 0} bookings</p>
          </div>
        )}
      </div>
    </CyberViewport>
  );
}
