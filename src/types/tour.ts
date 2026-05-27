export type TourStatus = 'PLANNING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type BookingStatus = 'PENDING' | 'DEPOSIT_PAID' | 'FULLY_PAID' | 'CANCELLED';
export type { AppRole, AppRole as StaffRole } from './platform';
export type ATOCategory = 'Transport' | 'Accommodation' | 'Meals' | 'Attractions' | 'Marketing' | 'Insurance' | 'Other';
export type VisaStatus = 'NOT_REQUIRED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PENDING_NZ_VISA';
export type ClientTier = 'STANDARD' | 'VIP' | 'VVIP';
export type VipTier = 'standard' | 'silver' | 'gold' | 'platinum';

export interface Tour {
  id: string;
  trip_code: string;
  destination: 'New Zealand' | 'Gold Coast' | 'Sydney';
  start_date: string;
  end_date: string;
  price_aud: number;
  max_pax: number;
  current_pax: number;
  status: TourStatus;
  base_commission_rate: number;
  bonus_threshold_pax: number;
  bonus_amount_aud: number;
}

export interface CRMClient {
  id: string;
  first_name_th: string;
  last_name_th: string;
  first_name_en: string;
  last_name_en: string;
  passport_number: string;
  visa_status: VisaStatus;
  oshc_provider: string;
  oshc_policy_number: string;
  oshc_expiry: string;
  medical_conditions: string;
  dietary_requirements: string;
  client_tier: ClientTier;
  vip_tier?: VipTier;
  total_trips?: number;
  lifetime_value?: number;
  album_delivered_at?: string;
  email?: string;
  phone?: string;
}

export interface Expense {
  id: string;
  tour_id: string | null;
  amount_aud: number;
  has_gst: boolean;
  gst_amount_aud: number;
  ato_category: ATOCategory;
  vendor_name: string;
  receipt_filename: string;
  is_synced: boolean;
  created_at: string;
}

export interface PayIDSettlement {
  tour_code: string;
  total_revenue: number;
  total_expenses: number;
  total_commissions: number;
  net_profit: number;
  gst_collected: number;
  gst_claimed: number;
}
