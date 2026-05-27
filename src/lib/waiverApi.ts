import { supabase } from './supabase';
import { WaiverData } from '../types/compliance';
import { StoredWaiver } from './waiverDb';

export interface ClientWaiverRecord extends WaiverData {
  id?: string;
  tour_id: string;
  language: 'EN' | 'TH';
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function computeWaiverContentHash(input: {
  waiver: Omit<WaiverData, 'content_hash' | 'ip_address'>;
  tour_id: string;
  language: 'EN' | 'TH';
  waiver_text: Record<string, string>;
}): Promise<string> {
  const stablePayload = JSON.stringify({
    v: 1,
    tour_id: input.tour_id,
    language: input.language,
    waiver: input.waiver,
    waiver_text: input.waiver_text,
  });

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stablePayload));
  return toHex(digest);
}

export async function saveClientWaiver(
  waiver: WaiverData,
  tourId: string,
  language: 'EN' | 'TH'
): Promise<void> {
  const { error } = await supabase.functions.invoke('record-waiver', {
    body: {
      client_id: waiver.client_id,
      tour_id: tourId,
      agreed_terms: waiver.agreed_terms,
      agreed_risk: waiver.agreed_risk,
      agreed_medical: waiver.agreed_medical,
      agreed_media: waiver.agreed_media,
      agreed_privacy: waiver.agreed_privacy,
      digital_signature: waiver.digital_signature,
      language,
      signed_at: waiver.signed_at,
      content_hash: waiver.content_hash,
    } satisfies ClientWaiverRecord,
  });

  if (error) throw error;
}

export async function fetchSignedClientIds(clientIds: string[]): Promise<Set<string>> {
  if (clientIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from('client_waivers')
    .select('client_id')
    .in('client_id', clientIds);

  if (error) throw error;

  return new Set((data ?? []).map((row: { client_id: string }) => row.client_id));
}

export function toStoredWaiver(
  waiver: WaiverData,
  tourId: string,
  language: 'EN' | 'TH'
): StoredWaiver {
  return {
    id: crypto.randomUUID(),
    tour_id: tourId,
    language,
    ...waiver,
  };
}
