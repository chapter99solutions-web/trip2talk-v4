-- Trip2Talk V4 — TASK 15: Customer lifecycle + VIP tiers + settlements log

CREATE TYPE vip_tier AS ENUM ('standard', 'silver', 'gold', 'platinum');

ALTER TABLE crm_clients
  ADD COLUMN IF NOT EXISTS vip_tier vip_tier NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS total_trips INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS album_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_trip_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS journey_phase TEXT;

ALTER TABLE tour_bookings
  ADD COLUMN IF NOT EXISTS album_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preferred_pickup TEXT,
  ADD COLUMN IF NOT EXISTS journey_phase TEXT;

CREATE TABLE IF NOT EXISTS net_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  revenue_aud NUMERIC(12,2) NOT NULL DEFAULT 0,
  expenses_aud NUMERIC(12,2) NOT NULL DEFAULT 0,
  commissions_aud NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_profit_aud NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_collected_aud NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_claimed_aud NUMERIC(12,2) NOT NULL DEFAULT 0,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sheets_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  sync_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_net_settlements_tour ON net_settlements(tour_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sheets_sync_log_tour ON sheets_sync_log(tour_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_clients_vip ON crm_clients(tenant_id, vip_tier);

CREATE OR REPLACE FUNCTION resolve_vip_tier(p_total_trips INT)
RETURNS vip_tier
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_total_trips >= 10 THEN 'platinum'::vip_tier
    WHEN p_total_trips >= 5 THEN 'gold'::vip_tier
    WHEN p_total_trips >= 3 THEN 'silver'::vip_tier
    ELSE 'standard'::vip_tier
  END;
$$;

CREATE OR REPLACE FUNCTION refresh_crm_journey_stats(
  p_client_id UUID,
  p_trip_revenue NUMERIC DEFAULT 0
)
RETURNS TABLE (vip_tier vip_tier, total_trips INT, lifetime_value NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INT;
  v_ltv NUMERIC;
  v_tier vip_tier;
BEGIN
  SELECT COUNT(*)::int INTO v_total
  FROM tour_bookings
  WHERE client_id = p_client_id
    AND status IN ('DEPOSIT_PAID', 'FULLY_PAID');

  SELECT COALESCE(SUM(amount_paid_aud), 0) + COALESCE(p_trip_revenue, 0) INTO v_ltv
  FROM tour_bookings
  WHERE client_id = p_client_id;

  v_tier := resolve_vip_tier(v_total);

  UPDATE crm_clients c
  SET
    total_trips = v_total,
    lifetime_value = v_ltv,
    vip_tier = v_tier,
    last_trip_at = NOW(),
    journey_phase = 'review'
  WHERE c.id = p_client_id;

  RETURN QUERY SELECT v_tier, v_total, v_ltv;
END;
$$;
