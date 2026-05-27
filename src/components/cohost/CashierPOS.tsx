import { useState, useEffect, useCallback, useMemo, FormEvent } from 'react';
import { BookingStatus, CRMClient, Tour } from '../../types/tour';
import { validateOSHC } from '../../lib/compliance';
import { fetchCashierPOSData, CashierPOSData } from '../../lib/supabaseData';
import { formatAUD } from '../../lib/payidCalc';
import { runPhase4OnTrip } from '../../lib/customerJourney';
import CyberViewport from '../layout/CyberViewport';
import LiveClock from '../cyber/LiveClock';
import AwaitingSync from '../cyber/AwaitingSync';
import TierBadge from '../cyber/TierBadge';
import VisaBadge from '../cyber/VisaBadge';
import TourStatusBadge from '../cyber/TourStatusBadge';
import { IconAlertTriangle } from '../icons/IconAlertTriangle';
import BookingPolicyPanel from '../policy/BookingPolicyPanel';
import TripSizeTierBadge from '../cyber/TripSizeTierBadge';
import { quoteTripTotal, resolveTripSizeTier } from '../../lib/bookingPolicy';

type PaymentMethod = 'PAYID' | 'BANK TRANSFER' | 'CASH' | 'CARD';

const PAYMENT_METHODS: PaymentMethod[] = ['PAYID', 'BANK TRANSFER', 'CASH', 'CARD'];

const BOOKING_STATUSES: BookingStatus[] = ['PENDING', 'DEPOSIT_PAID', 'FULLY_PAID'];

function clientFullName(c: CRMClient): string {
  return `${c.first_name_en} ${c.last_name_en}`.trim();
}

function oshcDaysRemaining(expiry: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiry);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function matchesSearch(client: CRMClient, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = clientFullName(client).toLowerCase();
  const passport = client.passport_number.toLowerCase();
  const th = `${client.first_name_th} ${client.last_name_th}`.toLowerCase();
  return name.includes(q) || passport.includes(q) || th.includes(q);
}

const TERMINAL_COPY = {
  cohost: {
    title: 'CO-HOST TERMINAL',
    subtitle: 'TRIP PAYMENTS & CLIENT CHECK-IN',
  },
  cashier: {
    title: 'POS INTAKE TERMINAL',
    subtitle: 'CASHIER PAYMENT PROTOCOL',
  },
} as const;

export default function CashierPOS({
  onLogout,
  variant = 'cashier',
}: {
  onLogout: () => void;
  variant?: keyof typeof TERMINAL_COPY;
}) {
  const copy = TERMINAL_COPY[variant];
  const [data, setData] = useState<CashierPOSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [tourId, setTourId] = useState('');
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('PENDING');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('PAYID');
  const [submitting, setSubmitting] = useState(false);
  const [txnRef, setTxnRef] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [partyPax, setPartyPax] = useState(4);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCashierPOSData();
      setData(result);
      setSynced(true);
      setError(null);
      if (result.tours.length > 0) {
        setTourId((prev) => prev || result.tours[0].id);
      }
    } catch (err) {
      setData(null);
      setSynced(false);
      const msg = err instanceof Error ? err.message : 'CONNECTION LOST';
      setError(msg);
      console.error('[Trip2Talk] CashierPOS sync failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clients = synced && data ? data.clients : [];
  const tours = synced && data ? data.tours : [];

  const filteredClients = useMemo(
    () => clients.filter((c) => matchesSearch(c, search)),
    [clients, search]
  );

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const selectedTour = useMemo(
    () => tours.find((t) => t.id === tourId) ?? null,
    [tours, tourId]
  );

  const amountNum = parseFloat(amount) || 0;
  const gstIncluded = amountNum > 0 ? amountNum / 11 : 0;

  const partyTier = resolveTripSizeTier(partyPax);
  const priceQuote = selectedTour ? quoteTripTotal(selectedTour.price_aud, partyPax) : null;

  useEffect(() => {
    if (!selectedTour) return;
    const q = quoteTripTotal(selectedTour.price_aud, partyPax);
    if (q.valid) setAmount(String(q.totalAud));
  }, [selectedTour?.id, selectedTour?.price_aud, partyPax]);

  const oshcWarning = useMemo(() => {
    if (!selectedClient) return null;
    const days = oshcDaysRemaining(selectedClient.oshc_expiry);
    if (days < 0) return { tone: 'crit' as const, text: `OSHC EXPIRED — ${selectedClient.oshc_expiry}` };
    if (days < 30) return { tone: 'warn' as const, text: `OSHC expires in ${days} days (${selectedClient.oshc_expiry})` };
    if (selectedTour) {
      const v = validateOSHC(selectedClient, selectedTour);
      if (!v.is_valid && v.warnings[0]) {
        return { tone: 'warn' as const, text: v.warnings[0] };
      }
    }
    return null;
  }, [selectedClient, selectedTour]);

  const resetTerminal = () => {
    setTxnRef(null);
    setAmount('');
    setSubmitError(null);
    setSearch('');
    setSelectedClientId(null);
    setBookingStatus('PENDING');
    setPaymentMethod('PAYID');
  };

  const showError = (msg: string) => {
    setSubmitError(msg);
  };

  const handlePayment = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!paymentMethod) {
      showError('Select a payment method');
      return;
    }
    if (!selectedClient) {
      showError('Select a client');
      return;
    }
    if (!selectedTour) {
      showError('Select a trip');
      return;
    }
    if (amountNum <= 0) {
      showError('Enter an amount');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const reference = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const tripCode = selectedTour.trip_code;

    try {
      const { warnings } = await runPhase4OnTrip({
        tourId: selectedTour.id,
        clientId: selectedClient.id,
        amountAud: amountNum,
        paymentMethod,
        bookingStatus,
        referenceNumber: reference,
        clientName: clientFullName(selectedClient),
        clientEmail: selectedClient.email,
        clientPhone: selectedClient.phone,
        tripCode,
      });

      if (warnings.length > 0) {
        console.warn('[Trip2Talk] Phase 4 (on trip) warnings:', warnings);
      }

      setTxnRef(reference);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      setSubmitError(msg);
      console.error('[Trip2Talk] CashierPOS payment failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <CyberViewport className="flex items-center justify-center p-6">
        <p className="text-amber-400 cyber-sync-dots font-sans">
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
            <h1 className="text-amber-400 font-semibold text-[22px] tracking-wide font-sans">
              {copy.title}
            </h1>
            <p className="text-neutral-500 text-sm mt-1 tracking-wide font-sans">{copy.subtitle}</p>
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
            <span className="font-sans text-sm font-medium text-red-400 tracking-wide">
              CONNECTION LOST — {error}
            </span>
            <button type="button" onClick={load} className="cyber-btn-ghost">
              RETRY SYNC
            </button>
          </div>
        )}

        {!synced ? (
          <AwaitingSync />
        ) : txnRef && selectedClient && selectedTour ? (
          <div className="cyber-card p-8 max-w-lg mx-auto text-center space-y-5">
            <div className="w-12 h-12 mx-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-2xl">
              ✓
            </div>
            <h2 className="font-sans text-lg font-semibold text-neutral-100 tracking-wide">
              TRANSACTION CHARGED
            </h2>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-left font-mono text-sm space-y-2">
              <p>
                <span className="text-neutral-500">REF:</span> {txnRef}
              </p>
              <p>
                <span className="text-neutral-500">CLIENT:</span> {clientFullName(selectedClient)}
              </p>
              <p>
                <span className="text-neutral-500">TRIP:</span> {selectedTour.trip_code}
              </p>
              <p>
                <span className="text-neutral-500">METHOD:</span> {paymentMethod}
              </p>
              <p>
                <span className="text-neutral-500">STATUS:</span> {bookingStatus.replace(/_/g, ' ')}
              </p>
              <p>
                <span className="text-neutral-500">PAID:</span>{' '}
                <span className="text-emerald-400 font-semibold">{formatAUD(amountNum)}</span>
              </p>
            </div>
            <button type="button" onClick={resetTerminal} className="cyber-btn-gold w-full">
              NEXT ORDER
            </button>
          </div>
        ) : (
          <form
            onSubmit={handlePayment}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* LEFT — Client & Tour */}
            <div className="cyber-card p-5 space-y-5">
              <h2 className="font-sans text-sm font-semibold text-amber-400/90 tracking-wide uppercase">
                Client &amp; Trip Selector
              </h2>

              <div>
                <label
                  htmlFor="client-search"
                  className="block font-sans text-xs text-neutral-500 mb-2 tracking-wide"
                >
                  Search client
                </label>
                <input
                  id="client-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or passport…"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 font-sans text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-400/40"
                  autoComplete="off"
                />
              </div>

              <div className="max-h-40 overflow-y-auto rounded-xl border border-neutral-800/80 divide-y divide-neutral-800/60">
                {filteredClients.length === 0 ? (
                  <p className="p-4 font-sans text-sm text-neutral-500 text-center">
                    No clients match
                  </p>
                ) : (
                  filteredClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClientId(c.id)}
                      className={`w-full text-left px-4 py-3 font-sans text-sm transition-colors ${
                        selectedClientId === c.id
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'text-neutral-300 hover:bg-neutral-900'
                      }`}
                    >
                      <span className="font-medium">{clientFullName(c)}</span>
                      <span className="font-mono text-xs text-neutral-500 ml-2">
                        {c.passport_number}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {selectedClient ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-sans text-base font-semibold text-neutral-100">
                      {clientFullName(selectedClient)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <TierBadge tier={selectedClient.client_tier} />
                      <VisaBadge status={selectedClient.visa_status} />
                    </div>
                  </div>
                  <p className="font-mono text-xs text-neutral-500">
                    Passport: {selectedClient.passport_number}
                  </p>
                  {oshcWarning && (
                    <div
                      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-sans ${
                        oshcWarning.tone === 'crit'
                          ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                          : 'bg-orange-500/10 border border-orange-500/30 text-orange-400'
                      }`}
                    >
                      <IconAlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{oshcWarning.text}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="font-sans text-sm text-neutral-600 text-center py-2">
                  Select a client from the list
                </p>
              )}

              <div>
                <label
                  htmlFor="tour-select"
                  className="block font-sans text-xs text-neutral-500 mb-2 tracking-wide"
                >
                  Trip (CONFIRMED / ACTIVE)
                </label>
                <select
                  id="tour-select"
                  value={tourId}
                  onChange={(e) => setTourId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 font-mono text-sm text-amber-400 focus:outline-none focus:border-amber-400/40"
                  disabled={tours.length === 0}
                >
                  {tours.length === 0 ? (
                    <option value="">No active trips</option>
                  ) : (
                    tours.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.trip_code} — {t.destination} ({t.status})
                      </option>
                    ))
                  )}
                </select>
                {selectedTour && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <TourStatusBadge status={selectedTour.status} />
                    <span className="font-mono text-xs text-neutral-500">
                      {formatAUD(selectedTour.price_aud)} list / pax
                    </span>
                    {partyTier && <TripSizeTierBadge tier={partyTier} />}
                  </div>
                )}
              </div>

              <BookingPolicyPanel
                tour={selectedTour}
                partyPax={partyPax}
                onPartyPaxChange={setPartyPax}
                paidAud={amountNum}
                compact
              />

              <div>
                <p className="font-sans text-xs text-neutral-500 mb-2 tracking-wide">
                  Booking status
                </p>
                <div className="flex flex-wrap gap-2">
                  {BOOKING_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setBookingStatus(s)}
                      className={`px-3 py-2 rounded-lg font-mono text-xs border transition-colors ${
                        bookingStatus === s
                          ? 'bg-amber-500 text-neutral-950 border-amber-500 font-semibold'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-600'
                      }`}
                    >
                      {s.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — Payment Terminal */}
            <div className="cyber-card p-5 space-y-6 flex flex-col">
              <h2 className="font-sans text-sm font-semibold text-amber-400/90 tracking-wide uppercase">
                Payment Terminal
              </h2>

              <div>
                <label
                  htmlFor="amount"
                  className="block font-sans text-xs text-neutral-500 mb-2 tracking-wide"
                >
                  Amount (AUD)
                </label>
                <input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-4 font-mono text-3xl font-semibold text-amber-400 focus:outline-none focus:border-amber-400/40 text-center"
                  required
                />
                {amountNum > 0 && (
                  <p className="mt-2 text-center font-mono text-sm text-emerald-400">
                    Includes GST: {formatAUD(gstIncluded)}
                  </p>
                )}
              </div>

              <div>
                <p className="font-sans text-xs text-neutral-500 mb-3 tracking-wide">
                  Payment method
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-3 px-2 rounded-xl font-mono text-xs tracking-wide border transition-colors ${
                        paymentMethod === m
                          ? 'bg-amber-500 text-neutral-950 border-amber-500 font-semibold'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-600'
                      }`}
                    >
                      [{m}]
                    </button>
                  ))}
                </div>
              </div>

              {submitError && (
                <p className="font-sans text-sm text-red-400 text-center">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={
                  !selectedClient || !selectedTour || amountNum <= 0 || submitting
                }
                className="cyber-btn-gold w-full mt-auto disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'PROCESSING…' : 'EXECUTE PAYMENT'}
              </button>
            </div>
          </form>
        )}
      </div>
    </CyberViewport>
  );
}
