import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatTourDateRangeLabel } from '../../lib/publicTours';
import { REAL_TOUR_CODES } from '../../lib/realTourCodes';
import { supabase } from '../../lib/supabase';
import type { TourStatus } from '../../types/tour';
import { OWNER_DARK_FIELD_CLS } from './ownerFormStyles';

type Lang = 'TH' | 'EN';

type ScheduleTourRow = {
  id: string;
  trip_code: string;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  max_pax: number | null;
  slots_booked: number | null;
  slots_max: number | null;
  price_aud: number | null;
  status: TourStatus | null;
};

type ScheduleEditForm = {
  start_date: string;
  end_date: string;
  max_pax: string;
  price_aud: string;
};

const GOLD = '#d4af37';
const TEAL = '#4dd8a0';
const NAVY = '#0d1b2a';

function formatAud(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function statusBadge(status: TourStatus | null): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25';
    case 'CONFIRMED':
      return 'bg-amber-500/15 text-amber-200 border-amber-400/25';
    default:
      return 'bg-white/5 text-white/70 border-white/10';
  }
}

function statusText(lang: Lang, status: TourStatus | null): string {
  if (status === 'ACTIVE') return lang === 'TH' ? 'เปิดรับจอง' : 'Active';
  if (status === 'CONFIRMED') return lang === 'TH' ? 'ปิดรับจอง' : 'Closed';
  return status || '—';
}

type Props = {
  lang: Lang;
  onToast: (tone: 'ok' | 'err', msg: string) => void;
};

export default function TripScheduleManager({ lang, onToast }: Props) {
  const [rows, setRows] = useState<ScheduleTourRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ScheduleEditForm | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tours')
        .select(
          'id, trip_code, title, start_date, end_date, max_pax, slots_booked, slots_max, price_aud, status'
        )
        .in('trip_code', [...REAL_TOUR_CODES])
        .order('trip_code', { ascending: true });

      if (error) throw error;

      setRows((data ?? []) as ScheduleTourRow[]);
    } catch (e) {
      onToast('err', e instanceof Error ? e.message : 'Failed to load trip schedule');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const orderedRows = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          REAL_TOUR_CODES.indexOf(a.trip_code as (typeof REAL_TOUR_CODES)[number]) -
          REAL_TOUR_CODES.indexOf(b.trip_code as (typeof REAL_TOUR_CODES)[number])
      ),
    [rows]
  );

  const openEdit = (row: ScheduleTourRow) => {
    setEditingId(row.id);
    setEditForm({
      start_date: row.start_date || '',
      end_date: row.end_date || row.start_date || '',
      max_pax: String(row.max_pax ?? row.slots_max ?? 5),
      price_aud: row.price_aud != null ? String(row.price_aud) : '',
    });
  };

  const cancelEdit = () => {
    if (savingId) return;
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async (row: ScheduleTourRow) => {
    if (!editForm) return;
    const start = editForm.start_date.trim();
    const end = editForm.end_date.trim() || start;
    const maxPax = Number(editForm.max_pax);
    const priceAud = Number(editForm.price_aud);

    if (!start) {
      onToast('err', lang === 'TH' ? 'กรุณาระบุวันเริ่ม' : 'Start date is required');
      return;
    }
    if (!Number.isFinite(maxPax) || maxPax < 1) {
      onToast('err', lang === 'TH' ? 'จำนวนที่นั่งไม่ถูกต้อง' : 'Invalid max seats');
      return;
    }
    if (!Number.isFinite(priceAud) || priceAud < 0) {
      onToast('err', lang === 'TH' ? 'ราคาไม่ถูกต้อง' : 'Invalid price');
      return;
    }

    setSavingId(row.id);
    try {
      const { error } = await supabase
        .from('tours')
        .update({
          start_date: start,
          end_date: end,
          max_pax: maxPax,
          slots_max: maxPax,
          price_aud: priceAud,
          price_per_person: priceAud,
        })
        .eq('id', row.id);

      if (error) throw error;

      onToast('ok', lang === 'TH' ? '✅ บันทึกรอบทริปแล้ว' : '✅ Trip schedule saved');
      setEditingId(null);
      setEditForm(null);
      await loadRows();
    } catch (e) {
      onToast('err', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  const setTripStatus = async (row: ScheduleTourRow, status: 'ACTIVE' | 'CONFIRMED') => {
    setStatusBusyId(row.id);
    try {
      const { error } = await supabase.from('tours').update({ status }).eq('id', row.id);
      if (error) throw error;
      onToast(
        'ok',
        status === 'ACTIVE'
          ? lang === 'TH'
            ? '🟢 เปิดรับจองแล้ว'
            : '🟢 Booking open'
          : lang === 'TH'
            ? '🔴 ปิดรับจองแล้ว'
            : '🔴 Booking closed'
      );
      await loadRows();
    } catch (e) {
      onToast('err', e instanceof Error ? e.message : 'Status update failed');
    } finally {
      setStatusBusyId(null);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
          📅 {lang === 'TH' ? 'จัดการรอบทริป' : 'Trip schedule manager'}
        </h2>
        <button
          type="button"
          onClick={() => void loadRows()}
          className="text-xs font-mono text-white/70 hover:text-white"
        >
          {lang === 'TH' ? 'รีเฟรช' : 'Refresh'}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-x-auto">
        <table className="min-w-[920px] w-full text-left">
          <thead className="text-[11px] uppercase tracking-wider text-white/60">
            <tr className="border-b border-white/10">
              <th className="p-3">Trip</th>
              <th className="p-3">{lang === 'TH' ? 'วันที่ปัจจุบัน' : 'Current dates'}</th>
              <th className="p-3">{lang === 'TH' ? 'ที่นั่ง' : 'Seats'}</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td className="p-4 text-white/60" colSpan={5}>
                  {lang === 'TH' ? 'กำลังโหลด…' : 'Loading…'}
                </td>
              </tr>
            ) : orderedRows.length === 0 ? (
              <tr>
                <td className="p-4 text-white/60" colSpan={5}>
                  {lang === 'TH' ? 'ไม่พบทริปในระบบ' : 'No trips found'}
                </td>
              </tr>
            ) : (
              orderedRows.map((row) => {
                const booked = row.slots_booked ?? 0;
                const maxSeats = row.slots_max ?? row.max_pax ?? 0;
                const dateLabel =
                  row.start_date != null
                    ? formatTourDateRangeLabel(row.start_date, row.end_date)
                    : '—';
                const editing = editingId === row.id;

                return (
                  <tr key={row.id} className="border-b border-white/5 align-top">
                    <td className="p-3">
                      <div className="font-mono text-xs" style={{ color: TEAL }}>
                        {row.trip_code}
                      </div>
                      <div className="text-white/80 text-xs mt-0.5">{row.title || '—'}</div>
                    </td>
                    <td className="p-3 text-white/80">
                      {dateLabel}
                      {row.price_aud != null && (
                        <div className="text-xs text-white/50 mt-1">{formatAud(row.price_aud)}</div>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs text-white/80">
                      {booked}/{maxSeats || '—'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-semibold ${statusBadge(row.status)}`}
                      >
                        {statusText(lang, row.status)}
                      </span>
                    </td>
                    <td className="p-3">
                      {editing && editForm ? (
                        <div className="space-y-2 min-w-[240px]">
                          <label className="block text-[10px] uppercase text-white/50">
                            {lang === 'TH' ? 'วันเริ่ม' : 'Start'}
                            <input
                              type="date"
                              value={editForm.start_date}
                              onChange={(e) =>
                                setEditForm((prev) =>
                                  prev ? { ...prev, start_date: e.target.value } : prev
                                )
                              }
                              className={`mt-1 w-full ${OWNER_DARK_FIELD_CLS} text-xs`}
                            />
                          </label>
                          <label className="block text-[10px] uppercase text-white/50">
                            {lang === 'TH' ? 'วันจบ' : 'End'}
                            <input
                              type="date"
                              value={editForm.end_date}
                              onChange={(e) =>
                                setEditForm((prev) =>
                                  prev ? { ...prev, end_date: e.target.value } : prev
                                )
                              }
                              className={`mt-1 w-full ${OWNER_DARK_FIELD_CLS} text-xs`}
                            />
                          </label>
                          <label className="block text-[10px] uppercase text-white/50">
                            {lang === 'TH' ? 'ที่นั่งสูงสุด' : 'Max seats'}
                            <input
                              type="number"
                              min={1}
                              value={editForm.max_pax}
                              onChange={(e) =>
                                setEditForm((prev) =>
                                  prev ? { ...prev, max_pax: e.target.value } : prev
                                )
                              }
                              className={`mt-1 w-full ${OWNER_DARK_FIELD_CLS} text-xs`}
                            />
                          </label>
                          <label className="block text-[10px] uppercase text-white/50">
                            Price AUD
                            <input
                              type="number"
                              min={0}
                              value={editForm.price_aud}
                              onChange={(e) =>
                                setEditForm((prev) =>
                                  prev ? { ...prev, price_aud: e.target.value } : prev
                                )
                              }
                              className={`mt-1 w-full ${OWNER_DARK_FIELD_CLS} text-xs`}
                            />
                          </label>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              disabled={savingId === row.id}
                              onClick={() => void saveEdit(row)}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold disabled:opacity-50"
                              style={{ background: GOLD, color: NAVY }}
                            >
                              {savingId === row.id ? '…' : lang === 'TH' ? 'บันทึก' : 'Save'}
                            </button>
                            <button
                              type="button"
                              disabled={savingId === row.id}
                              onClick={cancelEdit}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-white/15 text-white/80"
                            >
                              {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10"
                          >
                            ✏️ {lang === 'TH' ? 'แก้วันที่' : 'Edit dates'}
                          </button>
                          {row.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              disabled={statusBusyId === row.id}
                              onClick={() => void setTripStatus(row, 'CONFIRMED')}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-red-400/40 text-red-200 disabled:opacity-50"
                            >
                              🔴 {lang === 'TH' ? 'ปิดรับจอง' : 'Close booking'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={statusBusyId === row.id}
                              onClick={() => void setTripStatus(row, 'ACTIVE')}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-400/40 text-emerald-200 disabled:opacity-50"
                            >
                              🟢 {lang === 'TH' ? 'เปิดรับจอง' : 'Open booking'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
