-- Trip2Talk V4 — Expenses (ATO GST trigger), SaaS subscriptions, MRR snapshots

CREATE TYPE ato_category AS ENUM (
  'Transport', 'Accommodation', 'Meals', 'Attractions', 'Marketing', 'Insurance', 'Other'
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  amount_aud NUMERIC(12,2) NOT NULL,
  has_gst BOOLEAN NOT NULL DEFAULT TRUE,
  gst_amount_aud NUMERIC(12,2) NOT NULL DEFAULT 0,
  ato_category ato_category NOT NULL DEFAULT 'Other',
  vendor_name TEXT NOT NULL,
  receipt_filename TEXT,
  is_synced BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION expenses_set_gst()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.has_gst THEN
    NEW.gst_amount_aud := ROUND((NEW.amount_aud / 11)::numeric, 2);
  ELSE
    NEW.gst_amount_aud := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expenses_set_gst ON expenses;
CREATE TRIGGER trg_expenses_set_gst
  BEFORE INSERT OR UPDATE OF amount_aud, has_gst ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION expenses_set_gst();

CREATE TABLE IF NOT EXISTS saas_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  mrr_aud NUMERIC(12,2) NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  current_period_start DATE,
  current_period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mrr_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  snapshot_month DATE NOT NULL,
  mrr_aud NUMERIC(12,2) NOT NULL,
  active_subscriptions INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, snapshot_month)
);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_created ON expenses(tenant_id, created_at DESC);
