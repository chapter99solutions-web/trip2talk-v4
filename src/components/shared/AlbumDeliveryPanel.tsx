import { useCallback, useEffect, useState } from 'react';
import {
  AlbumDeliveryPatch,
  AlbumDeliveryRow,
  AlbumStatus,
  fetchAlbumDeliveryBookings,
  updateAlbumDelivery,
} from '../../lib/albumDelivery';
import AlbumDeliveryCard, { AlbumDeliveryBooking } from './AlbumDeliveryCard';

const STATUSES: AlbumStatus[] = ['pending', 'processing', 'delivered', 'expired'];

interface Draft {
  album_status: AlbumStatus;
  album_url: string;
  facebook_chat_url: string;
}

function toCardBooking(row: AlbumDeliveryRow): AlbumDeliveryBooking | null {
  if (!row.album_url?.trim()) return null;
  return {
    booking_ref: row.reference_number ?? row.id.slice(0, 8),
    client_name: row.client_name,
    tour_title: row.tour_title,
    album_url: row.album_url.trim(),
    facebook_chat_url: row.facebook_chat_url,
  };
}

export default function AlbumDeliveryPanel({ theme = 'cyber' }: { theme?: 'cyber' | 'light' }) {
  const [rows, setRows] = useState<AlbumDeliveryRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAlbumDeliveryBookings();
      setRows(list);
      const next: Record<string, Draft> = {};
      list.forEach((r) => {
        next[r.id] = {
          album_status: r.album_status,
          album_url: r.album_url ?? '',
          facebook_chat_url: r.facebook_chat_url ?? '',
        };
      });
      setDrafts(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchDraft = (id: string, partial: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...partial } }));
  };

  const handleSave = async (row: AlbumDeliveryRow) => {
    const draft = drafts[row.id];
    if (!draft) return;
    setSavingId(row.id);
    try {
      const patch: AlbumDeliveryPatch = {
        album_status: draft.album_status,
        album_url: draft.album_url.trim() || null,
        facebook_chat_url: draft.facebook_chat_url.trim() || null,
      };
      await updateAlbumDelivery(row.id, patch);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  const cardClass = theme === 'cyber' ? 'cyber-card p-5 space-y-4' : 'rounded-2xl border border-white/10 bg-[#132333] p-5 space-y-4';
  const labelClass = theme === 'cyber' ? 'cyber-form-label tracking-wide text-neutral-500' : 'text-xs text-white/50 uppercase';
  const inputClass = theme === 'cyber' ? 'cyber-input' : 'w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white';

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className={theme === 'cyber' ? 'cyber-section-header text-amber-400 tracking-wide' : 'text-lg font-semibold text-white'}>
          ALBUM DELIVERY · FACEBOOK INBOX
        </h2>
        <button type="button" onClick={() => void load()} className={theme === 'cyber' ? 'cyber-btn-ghost text-xs' : 'text-xs text-white/50 hover:text-white'}>
          REFRESH
        </button>
      </div>

      {error && (
        <p className={theme === 'cyber' ? 'text-sm text-red-400' : 'text-sm text-red-300'}>{error}</p>
      )}

      {loading ? (
        <p className={theme === 'cyber' ? 'text-neutral-500 text-sm' : 'text-white/50 text-sm'}>Loading bookings…</p>
      ) : rows.length === 0 ? (
        <p className={theme === 'cyber' ? 'text-neutral-500 text-sm' : 'text-white/50 text-sm'}>NO BOOKINGS YET</p>
      ) : (
        <div className="space-y-6">
          {rows.map((row) => {
            const draft = drafts[row.id];
            if (!draft) return null;
            const cardBooking = draft.album_status === 'delivered' ? toCardBooking({ ...row, ...draft, album_url: draft.album_url }) : null;

            return (
              <div key={row.id} className={theme === 'cyber' ? 'border border-white/10 rounded-xl p-4 space-y-3' : 'border border-white/10 rounded-xl p-4 space-y-3'}>
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className={theme === 'cyber' ? 'cyber-table-td font-medium' : 'font-medium text-white'}>
                      {row.client_name}
                    </p>
                    <p className={theme === 'cyber' ? 'font-mono text-xs text-amber-500/80' : 'font-mono text-xs text-white/50'}>
                      {row.reference_number ?? row.id.slice(0, 8)} · {row.tour_title}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Album status</label>
                    <select
                      value={draft.album_status}
                      onChange={(e) => patchDraft(row.id, { album_status: e.target.value as AlbumStatus })}
                      className={inputClass}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Facebook chat URL</label>
                    <input
                      type="url"
                      value={draft.facebook_chat_url}
                      onChange={(e) => patchDraft(row.id, { facebook_chat_url: e.target.value })}
                      placeholder="https://m.me/..."
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Album URL (signed link)</label>
                  <input
                    type="url"
                    value={draft.album_url}
                    onChange={(e) => patchDraft(row.id, { album_url: e.target.value })}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>

                <button
                  type="button"
                  disabled={savingId === row.id}
                  onClick={() => void handleSave(row)}
                  className={
                    theme === 'cyber'
                      ? 'px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-neutral-950 hover:bg-amber-400 disabled:opacity-50'
                      : 'px-4 py-2 rounded-xl text-sm font-semibold bg-[#4dd8a0] text-[#0d1b2a] hover:opacity-90 disabled:opacity-50'
                  }
                >
                  {savingId === row.id ? 'Saving…' : 'Save delivery'}
                </button>

                {cardBooking && <AlbumDeliveryCard booking={cardBooking} />}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
