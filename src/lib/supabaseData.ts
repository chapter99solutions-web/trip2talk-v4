import { supabase } from './supabase';
import { CRMClient, Expense, Tour, TourStatus } from '../types/tour';

export interface TourBooking {
  id: string;
  tour_id: string;
  client_id: string | null;
  amount_paid_aud: number;
  status: string;
  reference_number?: string | null;
  party_pax?: number | null;
  trip_date?: string | null;
  preferred_pickup?: string | null;
  payment_method?: string | null;
  created_at?: string | null;
}

export interface BookingWithRelations extends TourBooking {
  crm_clients: CRMClient | null;
  tours: Tour | null;
}

export interface OwnerDashboardData {
  tours: Tour[];
  bookings: TourBooking[];
  expenses: Expense[];
}

export interface StaffDashboardData {
  clients: CRMClient[];
  tours: Tour[];
  bookings: BookingWithRelations[];
}

export interface CashierPOSData {
  clients: CRMClient[];
  tours: Tour[];
}

/** Normalized row for Owner / Staff dashboards (Supabase source of truth). */
export type DashboardBookingRow = {
  bookingId: string;
  customerName: string;
  tourCode: string;
  tourName: string;
  pax: number;
  tourDate: string;
  totalAmount: number;
  bookingStatus: string;
  intakeStatus: string;
  emergencyContact: string;
  dietaryReq: string;
  medicalCondition: string;
  motionSickness: string;
  photoStyle: string;
  pickupDisplay: string;
  fullNamePassport: string;
  dob: string;
  email: string;
  phone: string;
};

function logSupabaseError(context: string, error: { message: string; code?: string; details?: string }) {
  console.error(`[Trip2Talk] ${context}:`, {
    message: error.message,
    code: error.code,
    details: error.details,
  });
}

function clientDisplayName(c: CRMClient | null | undefined): string {
  if (!c) return 'Guest';
  const en = `${c.first_name_en ?? ''} ${c.last_name_en ?? ''}`.trim();
  if (en) return en;
  const th = `${c.first_name_th ?? ''} ${c.last_name_th ?? ''}`.trim();
  return th || 'Guest';
}

function mapBookingToDashboardRow(b: BookingWithRelations): DashboardBookingRow {
  const c = b.crm_clients;
  const t = b.tours;
  const name = clientDisplayName(c);
  return {
    bookingId: b.reference_number || b.id,
    customerName: name,
    tourCode: t?.trip_code ?? '',
    tourName: t?.destination ?? t?.trip_code ?? '',
    pax: Number(b.party_pax ?? 1),
    tourDate: String(b.trip_date ?? '').slice(0, 10),
    totalAmount: Number(b.amount_paid_aud ?? 0),
    bookingStatus: String(b.status ?? 'PENDING'),
    intakeStatus: 'Pending',
    emergencyContact: '',
    dietaryReq: c?.dietary_requirements ?? '',
    medicalCondition: c?.medical_conditions ?? '',
    motionSickness: '',
    photoStyle: '',
    pickupDisplay: b.preferred_pickup ?? '',
    fullNamePassport: name,
    dob: '',
    email: c?.email ?? '',
    phone: c?.phone ?? '',
  };
}

/** All tour_bookings with client + tour joins — used by Owner/Staff dashboards. */
export async function fetchDashboardBookingsFromSupabase(): Promise<DashboardBookingRow[]> {
  const { data, error } = await supabase
    .from('tour_bookings')
    .select(
      `
      id,
      tour_id,
      client_id,
      amount_paid_aud,
      status,
      reference_number,
      party_pax,
      trip_date,
      preferred_pickup,
      payment_method,
      created_at,
      crm_clients (*),
      tours (*)
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('fetchDashboardBookingsFromSupabase', error);
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as BookingWithRelations[]).map(mapBookingToDashboardRow);
}

/** Revenue total from Supabase tour_bookings (non-cancelled). */
export function sumBookingRevenue(rows: DashboardBookingRow[]): number {
  return rows
    .filter((b) => !String(b.bookingStatus).toUpperCase().includes('CANCEL'))
    .reduce((s, b) => s + b.totalAmount, 0);
}

export async function fetchOwnerDashboardData(): Promise<OwnerDashboardData> {
  const [toursRes, bookingsRes, expensesRes] = await Promise.all([
    supabase.from('tours').select('*'),
    supabase.from('tour_bookings').select('*'),
    supabase.from('expenses').select('*'),
  ]);

  if (toursRes.error) logSupabaseError('tours query', toursRes.error);
  if (bookingsRes.error) logSupabaseError('tour_bookings query', bookingsRes.error);
  if (expensesRes.error) logSupabaseError('expenses query', expensesRes.error);

  const firstError = toursRes.error || bookingsRes.error || expensesRes.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    tours: (toursRes.data ?? []) as Tour[],
    bookings: (bookingsRes.data ?? []) as TourBooking[],
    expenses: (expensesRes.data ?? []) as Expense[],
  };
}

export async function fetchStaffDashboardData(): Promise<StaffDashboardData> {
  const { data, error } = await supabase.from('tour_bookings').select(`
    *,
    crm_clients (*),
    tours (*)
  `);

  if (error) {
    logSupabaseError('tour_bookings join query', error);
    throw new Error(error.message);
  }

  const bookings = (data ?? []) as BookingWithRelations[];
  const tourMap = new Map<string, Tour>();
  const clientMap = new Map<string, CRMClient>();

  bookings.forEach((b) => {
    if (b.tours?.id) tourMap.set(b.tours.id, b.tours);
    if (b.crm_clients?.id) clientMap.set(b.crm_clients.id, b.crm_clients);
  });

  return {
    clients: Array.from(clientMap.values()),
    tours: Array.from(tourMap.values()),
    bookings,
  };
}

export function tourRevenue(tourId: string, bookings: TourBooking[]): number {
  return bookings.filter((b) => b.tour_id === tourId).reduce((s, b) => s + b.amount_paid_aud, 0);
}

/** Co-Host / cashier dropdown — bookable tour statuses (not PLANNING/COMPLETED/CANCELLED). */
export const ACTIVE_TOUR_STATUSES: TourStatus[] = ['CONFIRMED', 'ACTIVE'];

function normalizeTourStatus(status: unknown): TourStatus {
  const raw = String(status ?? '').trim().toUpperCase();
  if (raw === 'ACTIVE' || raw === 'OPEN') return 'ACTIVE';
  if (raw === 'CONFIRMED') return 'CONFIRMED';
  if (raw === 'PLANNING') return 'PLANNING';
  if (raw === 'COMPLETED') return 'COMPLETED';
  if (raw === 'CANCELLED') return 'CANCELLED';
  return 'CONFIRMED';
}

export function isCashierEligibleTourStatus(status: unknown): boolean {
  const normalized = normalizeTourStatus(status);
  return ACTIVE_TOUR_STATUSES.includes(normalized);
}

function mapSupabaseTourRow(row: Record<string, unknown>): Tour {
  return {
    id: String(row.id),
    trip_code: String(row.trip_code ?? '').trim().toUpperCase(),
    destination: (row.destination as Tour['destination']) ?? 'Sydney',
    start_date: String(row.start_date ?? ''),
    end_date: String(row.end_date ?? ''),
    price_aud: Number(row.price_aud ?? 0),
    max_pax: Number(row.max_pax ?? row.slots_max ?? 6),
    current_pax: Number(row.slots_booked ?? row.current_pax ?? 0),
    status: normalizeTourStatus(row.status),
    base_commission_rate: Number(row.base_commission_rate ?? 0),
    bonus_threshold_pax: Number(row.bonus_threshold_pax ?? 5),
    bonus_amount_aud: Number(row.bonus_amount_aud ?? 0),
    slots_booked: (row.slots_booked as number | null) ?? null,
    slots_max: (row.slots_max as number | null) ?? null,
    departure_start: (row.departure_start as string | null) ?? null,
    departure_end: (row.departure_end as string | null) ?? null,
  };
}

export async function fetchCashierPOSData(): Promise<CashierPOSData> {
  const [clientsRes, toursRes] = await Promise.all([
    supabase.from('crm_clients').select('*'),
    supabase.from('tours').select('*').order('trip_code', { ascending: true }),
  ]);

  if (clientsRes.error) logSupabaseError('crm_clients query', clientsRes.error);
  if (toursRes.error) logSupabaseError('tours query', toursRes.error);

  if (toursRes.error) {
    throw new Error(toursRes.error.message);
  }

  const tours = ((toursRes.data ?? []) as Record<string, unknown>[])
    .filter((row) => isCashierEligibleTourStatus(row.status))
    .map(mapSupabaseTourRow)
    .filter((t) => Boolean(t.trip_code));

  return {
    clients: (clientsRes.data ?? []) as CRMClient[],
    tours,
  };
}

/** cover_image URLs keyed by trip_code — for trip card enrichment. */
export async function fetchTourCoverImageMap(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('tours').select('trip_code, cover_image');
  if (error) {
    console.warn('[Trip2Talk] fetchTourCoverImageMap:', error.message);
    return {};
  }
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    const code = String((row as { trip_code?: string }).trip_code ?? '').trim().toUpperCase();
    const url = String((row as { cover_image?: string }).cover_image ?? '').trim();
    if (code && url) out[code] = url;
  }
  return out;
}
