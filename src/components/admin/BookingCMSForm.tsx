import { useCallback, useEffect, useState } from 'react';
import {
  createCustomerBooking,
  fetchPendingIntakes,
  type PendingIntakeRow,
} from '../../lib/tripsSheetApi';
import { portalLinkForBooking } from '../../lib/siteUrl';

type Props = {
  tourCodes: string[];
};

function genBookingId(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `BK-${n}`;
}

function messengerCopyMessage(customerName: string, bookingId: string, link: string): string {
  return `สวัสดีค่ะคุณ ${customerName} 🌿

ขอบคุณที่จองทริปถ่ายภาพกับ Trip2Talk ค่ะ
Booking ID: ${bookingId}

กรุณากรอกข้อมูลก่อนเดินทาง (ใช้เวลา 2 นาที) ผ่านลิงก์นี้:
${link}

หากมีคำถาม ทัก Messenger ได้เลยนะคะ 🙏`;
}

export default function BookingCMSForm({ tourCodes }: Props) {
  const [tourCode, setTourCode] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'Deposit Paid' | 'Full Paid'>('Deposit Paid');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedLink, setSavedLink] = useState<string | null>(null);
  const [savedMeta, setSavedMeta] = useState<{ bookingId: string; customerName: string } | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingIntakeRow[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const rows = await fetchPendingIntakes();
      setPending(rows);
    } catch {
      setPending([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  useEffect(() => {
    if (!tourCode && tourCodes.length > 0) {
      setTourCode(tourCodes[0]);
    }
  }, [tourCodes, tourCode]);

  const flashCopy = (label: string) => {
    setCopyHint(label);
    window.setTimeout(() => setCopyHint(null), 2000);
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flashCopy(label);
    } catch {
      setError('Could not copy — please copy manually.');
    }
  };

  const onSave = async () => {
    const id = bookingId.trim();
    const tour = tourCode.trim();
    const name = customerName.trim();
    if (!id || !tour || !name) {
      setError('Tour Code, Booking ID, and Customer Name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    setSavedLink(null);
    setSavedMeta(null);
    try {
      const result = await createCustomerBooking({
        bookingId: id,
        tourCode: tour,
        customerName: name,
        bookingStatus,
      });
      const link = result.portalLink || portalLinkForBooking(id);
      setSavedLink(link);
      setSavedMeta({ bookingId: id, customerName: name });
      setBookingId('');
      setCustomerName('');
      void loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create booking');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-neutral-200">FORM 2 · REGISTER CUSTOMER BOOKING</p>

      <div>
        <label className="text-xs text-neutral-500 font-mono">Tour Code</label>
        <select
          className="cyber-input mt-1"
          value={tourCode}
          onChange={(e) => setTourCode(e.target.value)}
        >
          <option value="">Select trip code…</option>
          {tourCodes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-neutral-500 font-mono">Booking ID</label>
          <div className="flex gap-2 mt-1">
            <input
              className="cyber-input flex-1"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="BK-123456"
            />
            <button
              type="button"
              className="cyber-btn-ghost text-xs whitespace-nowrap px-3"
              onClick={() => setBookingId(genBookingId())}
            >
              Auto ID
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-neutral-500 font-mono">Customer Name</label>
          <input
            className="cyber-input mt-1"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Jane Doe"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-neutral-500 font-mono">Booking Status</label>
        <div className="flex gap-2 mt-2">
          {(['Deposit Paid', 'Full Paid'] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={
                bookingStatus === status
                  ? 'cyber-btn-gold text-xs flex-1'
                  : 'cyber-btn-ghost text-xs flex-1 opacity-80'
              }
              onClick={() => setBookingStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 font-mono" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="cyber-btn-gold"
        disabled={saving}
        onClick={() => void onSave()}
      >
        {saving ? 'CREATING…' : 'CREATE BOOKING'}
      </button>

      {savedLink && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <p className="text-xs font-mono text-amber-300">Booking created · intake Pending</p>
          <p className="text-xs text-neutral-400 break-all font-mono">{savedLink}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="cyber-btn-ghost text-xs"
              onClick={() => void copyText(savedLink, 'Link copied')}
            >
              Copy Link
            </button>
            <button
              type="button"
              className="cyber-btn-ghost text-xs"
              onClick={() =>
                void copyText(
                  messengerCopyMessage(
                    savedMeta?.customerName || 'ลูกค้า',
                    savedMeta?.bookingId || '',
                    savedLink
                  ),
                  'Message copied'
                )
              }
            >
              Copy Message
            </button>
          </div>
          {copyHint && <p className="text-xs text-teal-400 font-mono">{copyHint}</p>}
        </div>
      )}

      <div className="pt-4 border-t border-neutral-800">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-xs font-semibold text-neutral-400 font-mono uppercase tracking-wide">
            Pending intakes
          </p>
          <button
            type="button"
            className="text-xs text-amber-400 font-mono hover:underline"
            onClick={() => void loadPending()}
          >
            Refresh
          </button>
        </div>
        {pendingLoading ? (
          <p className="text-xs text-neutral-600 font-mono">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="text-xs text-neutral-600 font-mono">No pending intakes.</p>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {pending.map((row) => (
              <li
                key={row.bookingId}
                className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono border border-neutral-800 rounded-md px-3 py-2"
              >
                <span className="text-amber-300">{row.bookingId}</span>
                <span className="text-neutral-400">{row.tourCode}</span>
                <span className="text-neutral-300 truncate max-w-[40%]">{row.customerName}</span>
                <button
                  type="button"
                  className="text-teal-400 hover:underline"
                  onClick={() =>
                    void copyText(portalLinkForBooking(row.bookingId), 'Portal link copied')
                  }
                >
                  Copy link
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-neutral-600 font-mono leading-relaxed">
        Creates a row via <span className="text-neutral-400">/api/booking/create</span> → GAS{' '}
        <span className="text-neutral-400">createBooking</span>. Customer completes intake on the portal link.
      </p>
    </div>
  );
}
