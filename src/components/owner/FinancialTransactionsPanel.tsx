import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  currentAustralianFY,
  downloadCsv,
  exportTransactionsCsv,
  fetchTransactions,
  insertTransaction,
  summarizeFYTransactions,
  type PaymentMethod,
  type PaymentType,
  type TransactionRow,
} from '../../lib/transactions';
import { OWNER_DARK_FIELD_FULL_CLS } from './ownerFormStyles';

const NAVY = '#0d1b2a';
const GOLD = '#d4af37';
const TEAL = '#4dd8a0';

type Lang = 'TH' | 'EN';

type ActiveTourOption = {
  id: string;
  trip_code: string | null;
  title: string | null;
  destination: string | null;
  status: string | null;
};

function formatAud(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 }).format(n);
}

type Props = {
  lang: Lang;
  supaTours: ActiveTourOption[];
  showToast: (tone: 'ok' | 'err', msg: string) => void;
};

export default function FinancialTransactionsPanel({ lang, supaTours, showToast }: Props) {
  const currentFy = useMemo(() => currentAustralianFY(), []);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tripCode, setTripCode] = useState('');
  const [amountAud, setAmountAud] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('DEPOSIT');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PAYID');
  const [notes, setNotes] = useState('');

  const activeTours = useMemo(
    () => supaTours.filter((t) => t.status === 'ACTIVE' && t.trip_code),
    [supaTours]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTransactions();
      setRows(data);
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : 'Failed to load transactions');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!tripCode && activeTours[0]?.trip_code) {
      setTripCode(activeTours[0].trip_code);
    }
  }, [activeTours, tripCode]);

  const fySummary = useMemo(() => summarizeFYTransactions(rows, currentFy), [rows, currentFy]);

  const handleAdd = async () => {
    const amount = Number(amountAud);
    if (!tripCode.trim()) {
      showToast('err', lang === 'TH' ? 'เลือกทริป' : 'Select a trip');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('err', lang === 'TH' ? 'กรอกจำนวนเงินให้ถูกต้อง' : 'Enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      await insertTransaction({
        tripCode,
        amountAud: amount,
        paymentType,
        paymentMethod,
        notes,
      });
      setAmountAud('');
      setNotes('');
      showToast('ok', lang === 'TH' ? 'บันทึกรายการแล้ว' : 'Transaction saved');
      await load();
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const csv = exportTransactionsCsv(rows, currentFy);
    downloadCsv(`trip2talk-transactions-${currentFy}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      {/* Section A — FY revenue summary */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
            {lang === 'TH' ? 'สรุปรายได้ปีงบประมาณ' : 'Revenue summary'} · {currentFy}
          </h2>
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-mono text-white/70 hover:text-white"
          >
            {lang === 'TH' ? 'รีเฟรช' : 'Refresh'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/60">
              {lang === 'TH' ? 'รายได้รวมปีนี้' : 'Total revenue this FY'}
            </p>
            <p className="text-2xl font-semibold mt-1" style={{ color: TEAL }}>
              {formatAud(fySummary.totalRevenue)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/60">
              {lang === 'TH' ? 'GST รวม' : 'Total GST collected'}
            </p>
            <p className="text-2xl font-semibold mt-1" style={{ color: GOLD }}>
              {formatAud(fySummary.totalGst)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/60">{lang === 'TH' ? 'รายได้สุทธิ' : 'Net revenue'}</p>
            <p className="text-2xl font-semibold mt-1 text-white">{formatAud(fySummary.netRevenue)}</p>
          </div>
        </div>
      </section>

      {/* Section B — transactions table */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
          {lang === 'TH' ? 'รายการธุรกรรม' : 'Transactions'}
        </h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-x-auto">
          <table className="min-w-[760px] w-full text-left">
            <thead className="text-[11px] uppercase tracking-wider text-white/60">
              <tr className="border-b border-white/10">
                <th className="p-3">Date</th>
                <th className="p-3">Trip</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">GST</th>
                <th className="p-3">Payment Type</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td className="p-4 text-white/60" colSpan={6}>
                    {lang === 'TH' ? 'กำลังโหลด…' : 'Loading…'}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="p-4 text-white/60" colSpan={6}>
                    No transactions yet — add your first payment
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="p-3 font-mono text-xs text-white/80">
                      {r.transaction_date || r.created_at.slice(0, 10)}
                    </td>
                    <td className="p-3 font-mono text-xs" style={{ color: TEAL }}>
                      {r.trip_code}
                    </td>
                    <td className="p-3 text-right font-mono">{formatAud(Number(r.amount_aud))}</td>
                    <td className="p-3 text-right font-mono text-white/70">
                      {formatAud(Number(r.gst_collected))}
                    </td>
                    <td className="p-3 text-xs">{r.payment_type}</td>
                    <td className="p-3 text-xs text-white/70 max-w-[200px] truncate">{r.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section C — add transaction */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
          {lang === 'TH' ? 'เพิ่มรายการชำระเงิน' : 'Add transaction'}
        </h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-white/60 block mb-1">Trip</label>
            <select
              value={tripCode}
              onChange={(e) => setTripCode(e.target.value)}
              className={OWNER_DARK_FIELD_FULL_CLS}
            >
              {activeTours.length === 0 ? (
                <option value="">{lang === 'TH' ? 'ไม่มีทริป ACTIVE' : 'No active trips'}</option>
              ) : (
                activeTours.map((t) => (
                  <option key={t.id} value={t.trip_code || ''}>
                    {t.trip_code} — {t.title || t.destination}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/60 block mb-1">Amount (AUD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountAud}
              onChange={(e) => setAmountAud(e.target.value)}
              className={OWNER_DARK_FIELD_FULL_CLS}
            />
          </div>
          <div>
            <label className="text-xs text-white/60 block mb-1">Payment type</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as PaymentType)}
              className={OWNER_DARK_FIELD_FULL_CLS}
            >
              <option value="DEPOSIT">DEPOSIT</option>
              <option value="FINAL">FINAL</option>
              <option value="REFUND">REFUND</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/60 block mb-1">Payment method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className={OWNER_DARK_FIELD_FULL_CLS}
            >
              <option value="PAYID">PAYID</option>
              <option value="CASH">CASH</option>
              <option value="BANK_TRANSFER">BANK_TRANSFER</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-white/60 block mb-1">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={OWNER_DARK_FIELD_FULL_CLS}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              disabled={saving || activeTours.length === 0}
              onClick={() => void handleAdd()}
              className="w-full px-4 py-2.5 rounded-full text-sm font-semibold border disabled:opacity-50"
              style={{ borderColor: TEAL, color: NAVY, background: TEAL }}
            >
              {saving ? '…' : lang === 'TH' ? 'บันทึกรายการ' : 'Save transaction'}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-white/40 font-mono">
          FY auto: {currentFy} · GST 1/11 inclusive
        </p>
      </section>

      {/* Section D — export */}
      <section>
        <button
          type="button"
          onClick={handleExport}
          className="px-4 py-2.5 rounded-full text-sm font-semibold border"
          style={{ borderColor: GOLD, color: NAVY, background: GOLD }}
        >
          📥 Export FY CSV
        </button>
      </section>
    </div>
  );
}
