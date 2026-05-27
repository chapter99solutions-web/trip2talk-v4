-- Trip2Talk V4 — Tours, bookings, staff, PayID pool
-- Table names: tours, tour_bookings (do not rename)

CREATE TYPE tour_status AS ENUM ('PLANNING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE booking_status AS ENUM ('PENDING', 'DEPOSIT_PAID', 'FULLY_PAID', 'CANCELLED');

CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trip_code TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_aud NUMERIC(12,2) NOT NULL,
  max_pax INT NOT NULL DEFAULT 6,
  current_pax INT NOT NULL DEFAULT 0,
  status tour_status NOT NULL DEFAULT 'PLANNING',
  base_commission_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus_threshold_pax INT NOT NULL DEFAULT 0,
  bonus_amount_aud NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, trip_code)
);

CREATE TABLE IF NOT EXISTS tour_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  client_id UUID,
  amount_paid_aud NUMERIC(12,2) NOT NULL DEFAULT 0,
  status booking_status NOT NULL DEFAULT 'PENDING',
  payment_method TEXT,
  reference_number TEXT,
  party_pax INT,
  trip_size_tier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TASK 17 — Pickup points
-- pickup_location: 'thaitown_main' | 'custom_accommodation'
ALTER TABLE tour_bookings
  ADD COLUMN IF NOT EXISTS pickup_location TEXT,
  ADD COLUMN IF NOT EXISTS hotel_name TEXT;

CREATE TABLE IF NOT EXISTS staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  pin_user_id UUID REFERENCES pin_users(id) ON DELETE SET NULL,
  role app_role NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tour_id, pin_user_id, role)
);

CREATE TABLE IF NOT EXISTS payid_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  payid_alias TEXT NOT NULL,
  bsb TEXT,
  account_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tours_tenant_status ON tours(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tour_bookings_tour ON tour_bookings(tour_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_tour ON staff_assignments(tour_id);
