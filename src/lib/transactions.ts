import { supabase } from './supabase';

export type PaymentType = 'DEPOSIT' | 'FINAL' | 'REFUND';
export type PaymentMethod = 'PAYID' | 'CASH' | 'BANK_TRANSFER';

export type TransactionRow = {
  id: string;
  trip_code: string;
  guest_name: string | null;
  amount_aud: number;
  gst_collected: number;
  net_amount: number;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  financial_year: string;
  notes: string | null;
  transaction_date: string;
  created_at: string;
};

export type NewTransactionInput = {
  tripCode: string;
  guestName?: string;
  amountAud: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  notes?: string;
  transactionDate?: string;
};

function isMissingTransactionsTable(message: string): boolean {
  const m = (message || '').toLowerCase();
  return (
    m.includes('schema cache') ||
    m.includes("'public.transactions'") ||
    m.includes('relation "transactions"') ||
    (m.includes('transactions') && m.includes('does not exist'))
  );
}

/** Australian FY label e.g. FY2025-26 (1 Jul – 30 Jun). */
export function currentAustralianFY(date = new Date()): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  const startYear = month >= 6 ? year : year - 1;
  const endShort = String(startYear + 1).slice(-2);
  return `FY${startYear}-${endShort}`;
}

export function splitGstInclusive(amountAud: number): { gstCollected: number; netAmount: number } {
  const amount = Math.round(Math.abs(amountAud) * 100) / 100;
  const gstCollected = Math.round((amount / 11) * 100) / 100;
  const netAmount = Math.round((amount - gstCollected) * 100) / 100;
  return { gstCollected, netAmount };
}

export async function fetchTransactions(): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(
      'id, trip_code, guest_name, amount_aud, gst_collected, net_amount, payment_type, payment_method, financial_year, notes, transaction_date, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTransactionsTable(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []) as TransactionRow[];
}

export function summarizeFYTransactions(rows: TransactionRow[], fy: string) {
  const subset = rows.filter((r) => r.financial_year === fy);
  const totalRevenue = subset.reduce((s, r) => s + Number(r.amount_aud), 0);
  const totalGst = subset.reduce((s, r) => s + Number(r.gst_collected), 0);
  const netRevenue = subset.reduce((s, r) => s + Number(r.net_amount), 0);
  return { totalRevenue, totalGst, netRevenue, count: subset.length };
}

export async function insertTransaction(input: NewTransactionInput): Promise<TransactionRow> {
  const amountAud = Math.round(Math.abs(input.amountAud) * 100) / 100;
  const { gstCollected, netAmount } = splitGstInclusive(amountAud);
  const financialYear = currentAustralianFY();
  const transactionDate = input.transactionDate || new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      trip_code: input.tripCode.trim().toUpperCase(),
      guest_name: input.guestName?.trim() || null,
      amount_aud: amountAud,
      gst_collected: gstCollected,
      net_amount: netAmount,
      payment_type: input.paymentType,
      payment_method: input.paymentMethod,
      financial_year: financialYear,
      notes: input.notes?.trim() || null,
      transaction_date: transactionDate,
    })
    .select(
      'id, trip_code, guest_name, amount_aud, gst_collected, net_amount, payment_type, payment_method, financial_year, notes, transaction_date, created_at'
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as TransactionRow;
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportTransactionsCsv(rows: TransactionRow[], fy: string): string {
  const subset = rows.filter((r) => r.financial_year === fy);
  const header = ['Date', 'Trip', 'Guest', 'Amount', 'GST', 'Net', 'Payment Type', 'FY'];
  const lines = [header.join(',')];
  for (const r of subset) {
    const date = r.transaction_date || r.created_at.slice(0, 10);
    lines.push(
      [
        escapeCsv(date),
        escapeCsv(r.trip_code),
        escapeCsv(r.guest_name || ''),
        Number(r.amount_aud).toFixed(2),
        Number(r.gst_collected).toFixed(2),
        Number(r.net_amount).toFixed(2),
        escapeCsv(r.payment_type),
        escapeCsv(r.financial_year),
      ].join(',')
    );
  }
  return lines.join('\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
