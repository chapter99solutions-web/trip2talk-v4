import { supabase } from './supabase';
import type { ATOCategory } from '../types/tour';

export const RECEIPTS_BUCKET = 'receipts';
export const TAX_RECEIPTS_TABLE = 'tax_receipts';

export type TaxReceipt = {
  id: string;
  trip_code: string | null;
  amount_aud: number;
  gst_amount_aud: number;
  has_gst: boolean;
  ato_category: string;
  vendor_name: string | null;
  receipt_date: string | null;
  image_url: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type NewReceiptInput = {
  tripCode: string;
  amountAud: number;
  hasGst: boolean;
  category: ATOCategory;
  vendor: string;
  receiptDate: string;
  notes: string;
  uploadedBy: string;
  file: File | null;
};

/** GST in AU is 1/11 of a GST-inclusive total. */
export function computeGst(amountAud: number, hasGst: boolean): number {
  if (!hasGst || !Number.isFinite(amountAud) || amountAud <= 0) return 0;
  return Math.round((amountAud / 11) * 100) / 100;
}

/** Strip anything unsafe for a Storage object key, keep the extension. */
export function sanitizeFilename(name: string): string {
  const trimmed = (name || 'receipt').trim();
  const dot = trimmed.lastIndexOf('.');
  const base = (dot > 0 ? trimmed.slice(0, dot) : trimmed)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80) || 'receipt';
  const ext = (dot > 0 ? trimmed.slice(dot + 1) : '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8);
  return ext ? `${base}.${ext}` : base;
}

function isMissingResource(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('not found') ||
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes('bucket') ||
    m.includes('relation') ||
    m.includes('404')
  );
}

export class ReceiptSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReceiptSetupError';
  }
}

/**
 * Upload the receipt file to Storage bucket 'receipts' at
 * `{trip_code}/{YYYY-MM-DD}_{filename}` and return its public URL (or null
 * when no file was attached). Throws ReceiptSetupError if the bucket is absent.
 */
export async function uploadReceiptFile(file: File, tripCode: string, receiptDate: string): Promise<string | null> {
  const code = (tripCode || 'UNASSIGNED').trim().replace(/[^a-zA-Z0-9_-]+/g, '-') || 'UNASSIGNED';
  const datePart = (receiptDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const path = `${code}/${datePart}_${Date.now()}_${sanitizeFilename(file.name)}`;

  const { error } = await supabase.storage.from(RECEIPTS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
    cacheControl: '3600',
  });

  if (error) {
    if (isMissingResource(error.message)) {
      throw new ReceiptSetupError(
        `Storage bucket "${RECEIPTS_BUCKET}" is not set up yet. Create it in Supabase before uploading.`
      );
    }
    throw error;
  }

  const { data } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

/** Insert a tax-claim receipt row. Throws ReceiptSetupError when the table is absent. */
export async function insertTaxReceipt(input: NewReceiptInput): Promise<TaxReceipt> {
  const gst = computeGst(input.amountAud, input.hasGst);

  let imageUrl: string | null = null;
  if (input.file) {
    imageUrl = await uploadReceiptFile(input.file, input.tripCode, input.receiptDate);
  }

  const row = {
    trip_code: input.tripCode.trim() || null,
    amount_aud: Math.round(input.amountAud * 100) / 100,
    gst_amount_aud: gst,
    has_gst: input.hasGst,
    ato_category: input.category,
    vendor_name: input.vendor.trim() || null,
    receipt_date: input.receiptDate || null,
    image_url: imageUrl,
    notes: input.notes.trim() || null,
    uploaded_by: input.uploadedBy.trim() || null,
  };

  const { data, error } = await supabase.from(TAX_RECEIPTS_TABLE).insert(row).select().single();

  if (error) {
    if (isMissingResource(error.message)) {
      throw new ReceiptSetupError(
        `Table "public.${TAX_RECEIPTS_TABLE}" is not set up yet. Run supabase/14-schema-receipts-bookings.sql first.`
      );
    }
    throw error;
  }

  return data as TaxReceipt;
}

/** Fetch tax-claim receipts, optionally scoped to a trip code. Returns [] when the table is missing. */
export async function fetchTaxReceipts(tripCode?: string): Promise<{ rows: TaxReceipt[]; missing: boolean }> {
  let query = supabase
    .from(TAX_RECEIPTS_TABLE)
    .select('id, trip_code, amount_aud, gst_amount_aud, has_gst, ato_category, vendor_name, receipt_date, image_url, notes, uploaded_by, created_at')
    .order('receipt_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (tripCode && tripCode.trim()) {
    query = query.eq('trip_code', tripCode.trim());
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingResource(error.message)) {
      return { rows: [], missing: true };
    }
    throw error;
  }

  return { rows: (data ?? []) as TaxReceipt[], missing: false };
}

export type TaxSummaryRow = {
  date: string;
  vendor: string;
  category: string;
  amount: number;
  gst: number;
};

export function toSummaryRows(receipts: TaxReceipt[]): TaxSummaryRow[] {
  return receipts.map((r) => ({
    date: (r.receipt_date || r.created_at || '').slice(0, 10),
    vendor: r.vendor_name || '—',
    category: r.ato_category || 'Other',
    amount: Number(r.amount_aud) || 0,
    gst: Number(r.gst_amount_aud) || 0,
  }));
}

/** Build a BAS-friendly CSV string from summary rows. */
export function buildReceiptsCsv(rows: TaxSummaryRow[]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Date', 'Vendor', 'ATO Category', 'Amount (AUD)', 'GST (AUD)'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([escape(r.date), escape(r.vendor), escape(r.category), r.amount.toFixed(2), r.gst.toFixed(2)].join(','));
  }
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const totalGst = rows.reduce((s, r) => s + r.gst, 0);
  lines.push(['TOTAL', '', '', totalAmount.toFixed(2), totalGst.toFixed(2)].join(','));
  return lines.join('\r\n');
}

/** Trigger a client-side CSV download. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
