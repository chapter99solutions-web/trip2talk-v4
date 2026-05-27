import { CRMClient, Tour } from './tour';
export type WaiverType = 'core' | 'transport' | 'portfolio';

export interface WaiverData {
  client_id: string;
  waiver_type?: WaiverType;
  agreed_terms: boolean;
  agreed_risk: boolean;
  agreed_medical: boolean;
  agreed_media: boolean;
  agreed_privacy: boolean;
  agreed_transport?: boolean;
  digital_signature: string;
  signed_at: string;
  content_hash: string;
  ip_address?: string;
}
export interface OSHCValidation {
  is_valid: boolean;
  days_remaining: number;
  warnings: string[];
}
