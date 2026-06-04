-- Trip2Talk V4 — booking intake fields + owner transactions ledger

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS photo_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS emergency_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_code       TEXT NOT NULL,
  guest_name      TEXT,
  amount_aud      NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_collected   NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_type    TEXT NOT NULL
    CHECK (payment_type IN ('DEPOSIT', 'FINAL', 'REFUND')),
  payment_method  TEXT NOT NULL
    CHECK (payment_method IN ('PAYID', 'CASH', 'BANK_TRANSFER')),
  financial_year  TEXT NOT NULL,
  notes           TEXT,
  transaction_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_fy ON public.transactions (financial_year);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions (created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transactions_owner_read ON public.transactions;
CREATE POLICY transactions_owner_read ON public.transactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS transactions_owner_insert ON public.transactions;
CREATE POLICY transactions_owner_insert ON public.transactions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
