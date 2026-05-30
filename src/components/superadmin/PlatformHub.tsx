import { useCallback, useEffect, useState } from 'react';
import CyberViewport from '../layout/CyberViewport';
import AwaitingSync from '../cyber/AwaitingSync';
import OpsDashboardHeader from '../ops/OpsDashboardHeader';

const MASTER_SHEET_ID = '1U1APoAcFz5zwwcqql1uVHm4CCOtll7bhCLbCELUBuP4';
const SHEET_ID_STORAGE_KEY = 'GAS_SPREADSHEET_ID';
import { fetchOwnerDashboardData, OwnerDashboardData } from '../../lib/supabaseData';
import { supabase } from '../../lib/supabase';

function readSavedSheetId(): string {
  try {
    const saved = window.localStorage.getItem(SHEET_ID_STORAGE_KEY);
    return saved && saved.trim() ? saved.trim() : MASTER_SHEET_ID;
  } catch {
    return MASTER_SHEET_ID;
  }
}

export default function PlatformHub({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<OwnerDashboardData | null>(null);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectRef, setProjectRef] = useState<string>('—');
  const [sheetId, setSheetId] = useState<string>(() => readSavedSheetId());
  const [sheetSaved, setSheetSaved] = useState(false);

  const trimmedSheetId = sheetId.trim();
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${trimmedSheetId}/edit`;

  const saveSheetId = useCallback(() => {
    try {
      window.localStorage.setItem(SHEET_ID_STORAGE_KEY, trimmedSheetId);
    } catch {
      /* localStorage unavailable — keep in-memory value */
    }
    setSheetSaved(true);
    window.setTimeout(() => setSheetSaved(false), 3000);
  }, [trimmedSheetId]);

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
        <OpsDashboardHeader
          title="PLATFORM HUB"
          subtitle="Trip2Talk V4 · Platform Admin (PIN 3501)"
          onLogout={onLogout}
        />

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
          <p className="text-neutral-200 font-semibold">Google Sheets (Trips_Data)</p>

          <div className="space-y-2">
            <label
              htmlFor="gas-sheet-id"
              className="block text-xs text-neutral-500 uppercase tracking-wide"
            >
              Google Sheets ID
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="gas-sheet-id"
                type="text"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 font-mono text-xs text-teal focus:outline-none focus:border-[color:var(--teal)] break-all"
                placeholder="Spreadsheet ID"
              />
              <button
                type="button"
                onClick={saveSheetId}
                className="shrink-0 inline-flex items-center justify-center gap-1 rounded-md px-4 py-2 text-xs font-semibold text-black bg-emerald-400 hover:bg-emerald-300 transition-colors"
              >
                💾 Save
              </button>
            </div>

            {sheetSaved && (
              <p className="text-xs text-emerald-400" role="status">
                ✅ Spreadsheet ID saved
              </p>
            )}

            <p className="text-[11px] text-neutral-500 break-all">
              {sheetUrl}
            </p>

            <p className="text-[11px] text-neutral-500">
              ใช้ ID จาก URL ของ Google Sheets: .../spreadsheets/d/{'{ID}'}/edit
            </p>
          </div>

          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-gold hover:underline"
          >
            Open master sheet →
          </a>

          <p className="text-[11px] text-neutral-500 pt-1">
            After updating <span className="text-neutral-300">gas/Code.gs</span>, redeploy the Apps Script web app
            (owner login). Frontend reads via <span className="text-neutral-300">VITE_GAS_WEBAPP_URL</span>.
          </p>
        </div>

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
