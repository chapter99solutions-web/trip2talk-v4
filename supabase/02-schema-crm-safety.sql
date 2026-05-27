-- Trip2Talk V4 — CRM, waivers (AUS legal fields), safety, alerts

CREATE TYPE visa_status AS ENUM (
  'NOT_REQUIRED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PENDING_NZ_VISA'
);
CREATE TYPE client_tier AS ENUM ('STANDARD', 'VIP', 'VVIP');

CREATE TABLE IF NOT EXISTS crm_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name_th TEXT NOT NULL,
  last_name_th TEXT NOT NULL,
  first_name_en TEXT NOT NULL,
  last_name_en TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  visa_status visa_status NOT NULL DEFAULT 'NOT_REQUIRED',
  oshc_provider TEXT,
  oshc_policy_number TEXT,
  oshc_expiry DATE,
  medical_conditions TEXT DEFAULT '',
  dietary_requirements TEXT DEFAULT '',
  client_tier client_tier NOT NULL DEFAULT 'STANDARD',
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, passport_number)
);

DO $$
BEGIN
  ALTER TABLE tour_bookings
    ADD CONSTRAINT tour_bookings_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES crm_clients(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS client_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  agreed_terms BOOLEAN NOT NULL DEFAULT FALSE,
  agreed_risk BOOLEAN NOT NULL DEFAULT FALSE,
  agreed_medical BOOLEAN NOT NULL DEFAULT FALSE,
  agreed_media BOOLEAN NOT NULL DEFAULT FALSE,
  agreed_privacy BOOLEAN NOT NULL DEFAULT FALSE,
  digital_signature TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'EN',
  signed_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safety_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,
  briefing_version TEXT NOT NULL DEFAULT 'v1',
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_by UUID REFERENCES pin_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warn',
  message TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_waivers_client ON client_waivers(client_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_open ON compliance_alerts(tenant_id) WHERE resolved_at IS NULL;
