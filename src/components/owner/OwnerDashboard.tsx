import { useState, useEffect, useCallback, FormEvent } from 'react';
import { ATOCategory, Expense, Tour } from '../../types/tour';
import { formatAUD, generateReceiptFilename } from '../../lib/payidCalc';
import { saveExpenseLocally } from '../../lib/expenseDb';
import {
  syncExpenseToGoogleWorkspace,
  syncSettlementToGoogleSheets,
  buildSettlementForTour,
} from '../../lib/googleSync';
import { supabase } from '../../lib/supabase';
import {
  fetchOwnerDashboardData,
  tourRevenue,
  OwnerDashboardData,
} from '../../lib/supabaseData';
import CyberViewport from '../layout/CyberViewport';
import LiveClock from '../cyber/LiveClock';
import KpiCard from '../cyber/KpiCard';
import TourStatusBadge from '../cyber/TourStatusBadge';
import AwaitingSync from '../cyber/AwaitingSync';

const ATO_OPTIONS: ATOCategory[] = [
  'Transport',
  'Accommodation',
  'Meals',
  'Attractions',
  'Marketing',
  'Insurance',
  'Other',
];

const REVENUE_TARGET = 50_000;
const EXPENSE_BUDGET = 15_000;

interface ExpenseLogEntry {
  id: string;
  time: string;
  vendor: string;
  amount: number;
  category: string;
}

function formatLogTime(d = new Date()): string {
  return d.toLocaleTimeString('en-AU', { hour12: false });
}

export default function OwnerDashboard({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

  const [tourId, setTourId] = useState('');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ATOCategory>('Transport');
  const [hasGst, setHasGst] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [log, setLog] = useState<ExpenseLogEntry[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [syncMessage, setSyncMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOwnerDashboardData();
      setData(result);
      setSynced(true);
      setError(null);
      if (result.tours.length > 0) {
        setTourId((prev) => prev || result.tours[0].trip_code);
      }
    } catch (err) {
      setData(null);
      setSynced(false);
      const msg = err instanceof Error ? err.message : 'CONNECTION LOST';
      setError(msg);
      console.error('[Trip2Talk] OwnerDashboard sync failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tours = synced && data ? data.tours : [];
  const bookings = synced && data ? data.bookings : [];
  const expenses = synced && data ? data.expenses : [];

  const totalRevenue = bookings.reduce((s, b) => s + b.amount_paid_aud, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount_aud, 0);
  const netProfit = totalRevenue - totalExpenses;
  const gstClaimable = expenses.reduce((s, e) => s + e.gst_amount_aud, 0);

  const amountNum = parseFloat(amount) || 0;
  const gstPreview = hasGst ? amountNum / 11 : 0;

  const activeTours = tours.filter((t) => t.status === 'CONFIRMED' || t.status === 'ACTIVE');
  const completedTours = tours.filter((t) => t.status === 'COMPLETED');
  const unsyncedExpenses = expenses.filter((e) => !e.is_synced);

  const handleGoogleSync = async () => {
    if (syncStatus === 'syncing') return;

    const totalJobs = unsyncedExpenses.length + completedTours.length;
    if (totalJobs === 0) {
      setSyncMessage('No expenses or settlements to sync');
      setSyncStatus('done');
      return;
    }

    setSyncStatus('syncing');
    setSyncMessage(`Syncing ${unsyncedExpenses.length} expenses...`);
    setSpreadsheetUrl('');

    let syncedCount = 0;
    let lastUrl = '';

    try {
      for (const expense of unsyncedExpenses) {
        setSyncMessage(`Syncing ${syncedCount + 1} of ${unsyncedExpenses.length} expenses...`);
        const result = await syncExpenseToGoogleWorkspace(expense, null);
        if (!result.success) {
          throw new Error(result.error ?? 'Expense sync failed');
        }
        if (result.spreadsheetUrl) lastUrl = result.spreadsheetUrl;

        const { error: updateErr } = await supabase
          .from('expenses')
          .update({ is_synced: true })
          .eq('id', expense.id);

        if (updateErr) {
          console.warn('[Trip2Talk] Could not mark expense synced in DB:', updateErr);
        }

        syncedCount += 1;
        setData((prev) =>
          prev
            ? {
                ...prev,
                expenses: prev.expenses.map((e) =>
                  e.id === expense.id ? { ...e, is_synced: true } : e
                ),
              }
            : prev
        );
      }

      for (const tour of completedTours) {
        setSyncMessage(`Syncing settlement for ${tour.trip_code}...`);
        const settlement = buildSettlementForTour(tour, bookings, expenses);
        const result = await syncSettlementToGoogleSheets(settlement);
        if (!result.success) {
          throw new Error(result.error ?? `Settlement sync failed for ${tour.trip_code}`);
        }
        if (result.spreadsheetUrl) lastUrl = result.spreadsheetUrl;
      }

      if (lastUrl) setSpreadsheetUrl(lastUrl);
      setSyncMessage(`✓ ${syncedCount} expenses synced to Google Sheets`);
      setSyncStatus('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sync failed';
      setSyncMessage(msg);
      setSyncStatus('error');
      console.error('[Trip2Talk] Google Sheets sync failed:', err);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || !vendor || submitting) return;

    setSubmitting(true);
    try {
      const val = parseFloat(amount);
      const item: Expense = {
        id: crypto.randomUUID(),
        tour_id: tourId,
        amount_aud: val,
        has_gst: hasGst,
        gst_amount_aud: hasGst ? val / 11 : 0,
        ato_category: category,
        vendor_name: vendor,
        receipt_filename: generateReceiptFilename(tourId, val),
        is_synced: false,
        created_at: new Date().toISOString(),
      };
      const blob = new Blob(['receipt_stream'], { type: 'image/jpeg' });
      await saveExpenseLocally(item, blob);
      if (navigator.onLine) await syncExpenseToGoogleWorkspace(item, blob);

      setLog((prev) => [
        {
          id: item.id,
          time: formatLogTime(),
          vendor,
          amount: val,
          category,
        },
        ...prev.slice(0, 4),
      ]);

      setData((prev) =>
        prev ? { ...prev, expenses: [item, ...prev.expenses] } : prev
      );
      setAmount('');
      setVendor('');
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <CyberViewport className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-amber-400 font-semibold text-[22px] tracking-wide font-sans">OWNER HQ</h1>
            <p className="text-neutral-500 text-sm mt-1 tracking-wide font-sans">
              พี่แสน · Trip2Talk Command Center
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard
            label="Total Revenue"
            value={totalRevenue}
            percent={(totalRevenue / REVENUE_TARGET) * 100}
            barTone="emerald"
          />
          <KpiCard
            label="Total Expenses"
            value={totalExpenses}
            percent={(totalExpenses / EXPENSE_BUDGET) * 100}
            barTone="orange"
          />
          <KpiCard
            label="Net Profit"
            value={netProfit}
            percent={(Math.max(0, netProfit) / REVENUE_TARGET) * 100}
            barTone="emerald"
          />
          <KpiCard
            label="GST Claimable"
            value={gstClaimable}
            percent={(gstClaimable / EXPENSE_BUDGET) * 100}
            barTone="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 cyber-card overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h2 className="cyber-section-header text-amber-400 tracking-wide">ACTIVE OPERATIONS</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="p-3 cyber-table-th text-neutral-500 tracking-wide">TRIP CODE</th>
                    <th className="p-3 cyber-table-th text-neutral-500 tracking-wide">DESTINATION</th>
                    <th className="p-3 cyber-table-th text-neutral-500 tracking-wide">PAX</th>
                    <th className="p-3 cyber-table-th text-neutral-500 tracking-wide">STATUS</th>
                    <th className="p-3 cyber-table-th text-neutral-500 tracking-wide">REVENUE</th>
                    <th className="p-3 cyber-table-th text-neutral-500 tracking-wide">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTours.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 cyber-table-td text-neutral-500 text-sm text-center">
                        NO ACTIVE TRIPS
                      </td>
                    </tr>
                  ) : (
                    activeTours.map((t: Tour) => (
                      <tr key={t.id} className="cyber-table-row border-b border-white/5">
                        <td className="p-3 font-mono text-amber-400/90 text-sm">{t.trip_code}</td>
                        <td className="p-3 cyber-table-td">{t.destination}</td>
                        <td className="p-3 cyber-table-td font-mono">
                          {t.current_pax}/{t.max_pax}
                        </td>
                        <td className="p-3">
                          <TourStatusBadge status={t.status} />
                        </td>
                        <td className="p-3 cyber-table-td text-emerald-400 font-medium">
                          {formatAUD(tourRevenue(t.id, bookings))}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => setTourId(t.trip_code)}
                            className="font-sans text-sm text-neutral-500 hover:text-amber-400 tracking-wide"
                          >
                            LOG EXPENSE
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="cyber-card p-5 space-y-4">
            <h2 className="cyber-section-header text-amber-400 tracking-wide uppercase">
              Commit Expense To Ledger
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                value={tourId}
                onChange={(e) => setTourId(e.target.value)}
                placeholder="TOUR ID / TRIP CODE"
                className="cyber-input"
                required
              />
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="VENDOR"
                className="cyber-input"
                required
              />
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="AMOUNT AUD"
                  className="cyber-input"
                  required
                />
                {hasGst && amountNum > 0 && (
                  <p className="font-sans text-sm font-medium mt-1" style={{ color: 'var(--neon-emerald)' }}>
                    GST: {formatAUD(gstPreview)}
                  </p>
                )}
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ATOCategory)}
                className="cyber-input"
              >
                {ATO_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between cyber-card p-3">
                <span className="cyber-form-label tracking-wide">HAS GST</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hasGst}
                  onClick={() => setHasGst((v) => !v)}
                  className={`cyber-toggle ${hasGst ? 'on' : ''}`}
                >
                  <span className="cyber-toggle-knob" />
                </button>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded-xl tracking-wide text-base font-sans transition disabled:opacity-50"
              >
                {submitting ? 'COMMITTING…' : 'COMMIT TO WORKSPACE'}
              </button>
            </form>
            <div className="max-h-36 overflow-y-auto space-y-1 border-t border-white/5 pt-3">
              {log.length === 0 ? (
                <p className="font-mono text-sm text-neutral-600">NO COMMITS THIS SESSION</p>
              ) : (
                log.map((entry) => (
                  <p key={entry.id} className="text-neutral-400 cyber-log-entry">
                    [{entry.time}] {entry.vendor} — {formatAUD(entry.amount)} ({entry.category})
                  </p>
                ))
              )}
            </div>

            <div className="border-t border-white/5 pt-3 space-y-2">
              {syncStatus === 'syncing' && syncMessage && (
                <p className="font-mono text-xs text-amber-400">{syncMessage}</p>
              )}
              {syncStatus === 'done' && syncMessage && (
                <p className="font-mono text-xs text-emerald-400">{syncMessage}</p>
              )}
              {syncStatus === 'error' && syncMessage && (
                <p className="font-mono text-xs text-red-400">{syncMessage}</p>
              )}
              {syncStatus === 'done' && spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-amber-400 hover:text-amber-300 underline block"
                >
                  Open Google Sheet →
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  if (syncStatus === 'done' && spreadsheetUrl) {
                    window.open(spreadsheetUrl, '_blank', 'noopener,noreferrer');
                    return;
                  }
                  handleGoogleSync();
                }}
                disabled={syncStatus === 'syncing'}
                className={`w-full py-3 rounded-xl border font-sans text-sm font-semibold tracking-wide flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed ${
                  syncStatus === 'syncing'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : syncStatus === 'done'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : syncStatus === 'error'
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-600'
                }`}
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <span className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    SYNCING…
                  </>
                ) : syncStatus === 'done' ? (
                  <>
                    <span className="text-emerald-400">✓</span>
                    {spreadsheetUrl ? 'SYNCED — View Sheet' : 'SYNCED'}
                  </>
                ) : syncStatus === 'error' ? (
                  'SYNC FAILED — RETRY'
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
                      <path
                        fill="currentColor"
                        d="M12 11.2v3.6h3.6c-.2 1.9-1.7 3.4-3.6 3.4-2 0-3.6-1.6-3.6-3.6s1.6-3.6 3.6-3.6c.8 0 1.5.3 2.1.7l2.7-2.7C15.5 8.3 13.8 7.6 12 7.6 8.9 7.6 6.4 10.1 6.4 13.2S8.9 18.8 12 18.8 17.6 16.3 17.6 13.2h3.6c0 3.9-3.2 7.2-7.2 7.2S5.2 17.1 5.2 13.2 8.4 6 12 6c1.7 0 3.2.6 4.4 1.6l3.2-3.2V2h-8v3.6L12 11.2z"
                      />
                    </svg>
                    SYNC TO GOOGLE SHEETS
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </CyberViewport>
  );
}
