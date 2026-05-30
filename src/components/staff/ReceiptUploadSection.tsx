import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Download, FileText, Image as ImageIcon, Loader, Receipt, Upload, X } from 'lucide-react';
import type { ATOCategory, Expense } from '../../types/tour';
import { getAllLocalExpenses } from '../../lib/expenseDb';
import {
  buildReceiptsCsv,
  computeGst,
  downloadCsv,
  fetchTaxReceipts,
  insertTaxReceipt,
  ReceiptSetupError,
  toSummaryRows,
  type TaxReceipt,
  type TaxSummaryRow,
} from '../../lib/receipts';

const NAVY = '#0d1b2a';
const GOLD = '#d4af37';
const TEAL = '#4dd8a0';

const ATO_CATEGORIES: ATOCategory[] = [
  'Transport',
  'Accommodation',
  'Meals',
  'Attractions',
  'Marketing',
  'Insurance',
  'Other',
];

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const ACCEPTED_EXT = ['jpg', 'jpeg', 'png', 'pdf'];
const MAX_BYTES = 10 * 1024 * 1024;

type Lang = 'TH' | 'EN';

type Props = {
  lang: Lang;
  tripCode: string;
  uploadedBy?: string;
  onToast: (tone: 'ok' | 'err', msg: string) => void;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isAccepted(file: File): boolean {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXT.includes(ext);
}

function vendorGuessFromFilename(name: string): string {
  const base = (name.split('.').slice(0, -1).join('.') || name)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\d{2,}\b/g, ' ')
    .replace(/receipt|invoice|scan|img|photo/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return base.length >= 3 ? base.slice(0, 40) : '';
}

export default function ReceiptUploadSection({ lang, tripCode, uploadedBy = '', onToast }: Props) {
  const t = (th: string, en: string) => (lang === 'TH' ? th : en);
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ATOCategory>('Meals');
  const [vendor, setVendor] = useState('');
  const [receiptDate, setReceiptDate] = useState(todayIso());
  const [hasGst, setHasGst] = useState(true);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [receipts, setReceipts] = useState<TaxReceipt[]>([]);
  const [localExpenses, setLocalExpenses] = useState<Expense[]>([]);
  const [summaryNote, setSummaryNote] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const applyFile = useCallback(
    (next: File | null) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (!next) {
        setFile(null);
        setPreviewUrl(null);
        return;
      }
      if (!isAccepted(next)) {
        onToast('err', t('รองรับเฉพาะ JPG, PNG, PDF', 'Only JPG, PNG, PDF allowed'));
        return;
      }
      if (next.size > MAX_BYTES) {
        onToast('err', t('ไฟล์ต้องไม่เกิน 10MB', 'File must be 10MB or smaller'));
        return;
      }
      setFile(next);
      setPreviewUrl(next.type.startsWith('image/') ? URL.createObjectURL(next) : null);
      if (!vendor.trim()) {
        const guess = vendorGuessFromFilename(next.name);
        if (guess) setVendor(guess);
      }
    },
    [onToast, previewUrl, t, vendor]
  );

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryNote(null);
    try {
      const [{ rows, missing }, local] = await Promise.all([
        fetchTaxReceipts(tripCode || undefined),
        getAllLocalExpenses().catch(() => [] as Expense[]),
      ]);
      setReceipts(rows);
      setLocalExpenses(local.filter((e) => !e.is_synced));
      if (missing) {
        setSummaryNote(
          t(
            'ยังไม่ได้ตั้งค่าตาราง tax_receipts — แสดงเฉพาะรายการออฟไลน์',
            'tax_receipts table not set up yet — showing offline rows only'
          )
        );
      }
    } catch (e) {
      setSummaryNote(e instanceof Error ? e.message : 'Failed to load receipts');
    } finally {
      setSummaryLoading(false);
    }
  }, [tripCode, t]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const summaryRows: TaxSummaryRow[] = useMemo(() => {
    const fromDb = toSummaryRows(receipts);
    const fromLocal: TaxSummaryRow[] = localExpenses.map((e) => ({
      date: (e.created_at || '').slice(0, 10),
      vendor: e.vendor_name || '—',
      category: e.ato_category || 'Other',
      amount: Number(e.amount_aud) || 0,
      gst: Number(e.gst_amount_aud) || 0,
    }));
    return [...fromDb, ...fromLocal].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [receipts, localExpenses]);

  const totals = useMemo(() => {
    return summaryRows.reduce(
      (acc, r) => ({ amount: acc.amount + r.amount, gst: acc.gst + r.gst }),
      { amount: 0, gst: 0 }
    );
  }, [summaryRows]);

  const previewGst = useMemo(() => computeGst(Number(amount), hasGst), [amount, hasGst]);

  const resetForm = () => {
    applyFile(null);
    setAmount('');
    setVendor('');
    setNotes('');
    setReceiptDate(todayIso());
    setHasGst(true);
    setCategory('Meals');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSave = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      onToast('err', t('กรอกจำนวนเงินให้ถูกต้อง', 'Enter a valid amount'));
      return;
    }
    setBusy(true);
    try {
      await insertTaxReceipt({
        tripCode,
        amountAud: amt,
        hasGst,
        category,
        vendor,
        receiptDate,
        notes,
        uploadedBy,
        file,
      });
      onToast('ok', t('บันทึกใบเสร็จแล้ว', 'Receipt saved'));
      resetForm();
      void loadSummary();
    } catch (e) {
      if (e instanceof ReceiptSetupError) {
        onToast('err', e.message);
      } else {
        onToast('err', e instanceof Error ? e.message : 'Save failed');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleExportCsv = () => {
    if (summaryRows.length === 0) {
      onToast('err', t('ไม่มีข้อมูลให้ส่งออก', 'No rows to export'));
      return;
    }
    const csv = buildReceiptsCsv(summaryRows);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`tax-receipts-${tripCode || 'all'}-${stamp}.csv`, csv);
    onToast('ok', t('ดาวน์โหลด CSV แล้ว', 'CSV downloaded'));
  };

  const inputClass =
    'mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30';

  return (
    <>
      {/* Receipt upload (Tax Claim) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
          📎 {t('อัปโหลดใบเสร็จ (Tax Claim)', 'Upload receipt (Tax Claim)')}
        </h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) applyFile(dropped);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-emerald-400 bg-emerald-400/10' : 'border-white/15 hover:border-white/30 bg-black/20'
            }`}
          >
            {file ? (
              <div className="flex items-center gap-3 w-full">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="h-16 w-16 rounded-lg object-cover border border-white/10"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-white/10 bg-black/30 flex items-center justify-center">
                    <FileText className="h-7 w-7" style={{ color: TEAL }} />
                  </div>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium text-white/90 truncate">{file.name}</p>
                  <p className="text-xs text-white/50">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyFile(null);
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                  className="shrink-0 rounded-full p-1.5 border border-white/15 bg-white/5 hover:bg-white/10"
                  aria-label="remove file"
                >
                  <X className="h-4 w-4 text-white/70" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-7 w-7" style={{ color: TEAL }} />
                <p className="text-sm text-white/80">
                  {t('ลากวางไฟล์ที่นี่ หรือคลิกเพื่อเลือก', 'Drag & drop a file here, or click to select')}
                </p>
                <p className="text-xs text-white/40 flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" /> JPG · PNG · PDF
                </p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={(e) => applyFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-white/60">{t('จำนวน (AUD)', 'Amount (AUD)')}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/60">{t('หมวด ATO', 'ATO category')}</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ATOCategory)}
                className={inputClass}
              >
                {ATO_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-white/60">{t('ร้านค้า / ผู้ขาย', 'Vendor / Shop name')}</span>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder={t('เช่น Woolworths', 'e.g. Woolworths')}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/60">{t('วันที่ในใบเสร็จ', 'Date of receipt')}</span>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block sm:col-span-2 lg:col-span-1">
              <span className="text-xs text-white/60">{t('หมายเหตุ (ไม่บังคับ)', 'Notes (optional)')}</span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('รายละเอียดเพิ่มเติม', 'Extra detail')}
                className={inputClass}
              />
            </label>
            <div className="flex items-end">
              <label className="flex items-center gap-2 py-2.5">
                <input
                  type="checkbox"
                  checked={hasGst}
                  onChange={(e) => setHasGst(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-xs text-white/70">
                  {t('รวม GST', 'GST included')}
                  {hasGst && Number(amount) > 0 ? (
                    <span className="text-white/40"> · GST ${previewGst.toFixed(2)}</span>
                  ) : null}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border disabled:opacity-50"
              style={{ borderColor: TEAL, color: NAVY, background: TEAL }}
            >
              {busy ? <Loader className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              {busy ? '…' : t('บันทึก', 'Save')}
            </button>
          </div>
        </div>
      </section>

      {/* Tax summary (collapsible) */}
      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setSummaryOpen((p) => !p)}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
            {t('สรุปค่าใช้จ่ายเพื่อเคลม Tax', 'Tax claim expense summary')}
          </h2>
          <span className="flex items-center gap-2 text-xs text-white/60">
            {summaryRows.length} {t('รายการ', 'rows')}
            <ChevronDown className={`h-4 w-4 transition-transform ${summaryOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {summaryOpen && (
          <div className="space-y-3">
            {summaryNote && (
              <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-100">
                {summaryNote}
              </div>
            )}
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-x-auto">
              <table className="min-w-[640px] w-full text-left">
                <thead className="text-[11px] uppercase tracking-wider text-white/60">
                  <tr className="border-b border-white/10">
                    <th className="p-3">{t('วันที่', 'Date')}</th>
                    <th className="p-3">{t('ร้านค้า', 'Vendor')}</th>
                    <th className="p-3">{t('หมวด', 'Category')}</th>
                    <th className="p-3 text-right">{t('จำนวน', 'Amount')}</th>
                    <th className="p-3 text-right">GST</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {summaryLoading ? (
                    <tr>
                      <td className="p-4 text-white/60" colSpan={5}>
                        {t('กำลังโหลด…', 'Loading…')}
                      </td>
                    </tr>
                  ) : summaryRows.length === 0 ? (
                    <tr>
                      <td className="p-4 text-white/60" colSpan={5}>
                        {t('ยังไม่มีใบเสร็จ', 'No receipts yet')}
                      </td>
                    </tr>
                  ) : (
                    summaryRows.map((r, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="p-3 font-mono text-xs text-white/70">{r.date || '—'}</td>
                        <td className="p-3 text-white/90">{r.vendor}</td>
                        <td className="p-3 text-white/80">{r.category}</td>
                        <td className="p-3 text-right text-white/90">${r.amount.toFixed(2)}</td>
                        <td className="p-3 text-right text-white/70">${r.gst.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {summaryRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-white/15 font-semibold">
                      <td className="p-3" colSpan={3} style={{ color: GOLD }}>
                        {t('รวมทั้งหมด', 'Total')}
                      </td>
                      <td className="p-3 text-right" style={{ color: TEAL }}>
                        ${totals.amount.toFixed(2)}
                      </td>
                      <td className="p-3 text-right" style={{ color: TEAL }}>
                        ${totals.gst.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-white/50">
                {t('GST เคลมได้รวม', 'Total GST claimable')}:{' '}
                <span style={{ color: TEAL }}>${totals.gst.toFixed(2)}</span>
              </p>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10"
              >
                <Download className="h-4 w-4" /> {t('ส่งออก CSV', 'Export CSV')}
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
