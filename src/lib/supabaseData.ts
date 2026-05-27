import { supabase } from './supabase';
import { CRMClient, Expense, Tour, TourStatus } from '../types/tour';

export interface TourBooking {
  id: string;
  tour_id: string;
  client_id: string | null;
  amount_paid_aud: number;
  status: string;
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

function logSupabaseError(context: string, error: { message: string; code?: string; details?: string }) {
  console.error(`[Trip2Talk] ${context}:`, {
    message: error.message,
    code: error.code,
    details: error.details,
  });
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

export const ACTIVE_TOUR_STATUSES: TourStatus[] = ['CONFIRMED', 'ACTIVE'];

export async function fetchCashierPOSData(): Promise<CashierPOSData> {
  const [clientsRes, toursRes] = await Promise.all([
    supabase.from('crm_clients').select('*'),
    supabase.from('tours').select('*'),
  ]);

  if (clientsRes.error) logSupabaseError('crm_clients query', clientsRes.error);
  if (toursRes.error) logSupabaseError('tours query', toursRes.error);

  const firstError = clientsRes.error || toursRes.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  const tours = ((toursRes.data ?? []) as Tour[]).filter((t) =>
    ACTIVE_TOUR_STATUSES.includes(t.status)
  );

  return {
    clients: (clientsRes.data ?? []) as CRMClient[],
    tours,
  };
}
