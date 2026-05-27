-- Trip2Talk V4 — Auth: tenants + PIN users (run first)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE app_role AS ENUM ('STAFF', 'COHOST', 'OWNER', 'PLATFORM_ADMIN');

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  abn TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  pin_code TEXT NOT NULL,
  pin_hash TEXT,
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, pin_code)
);

CREATE INDEX IF NOT EXISTS idx_pin_users_tenant_role ON pin_users(tenant_id, role);

-- Verify PIN server-side (optional; PWA may still gate locally)
CREATE OR REPLACE FUNCTION verify_pin(p_tenant_slug TEXT, p_pin TEXT)
RETURNS TABLE (user_id UUID, role app_role, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pu.id, pu.role, pu.display_name
  FROM pin_users pu
  JOIN tenants t ON t.id = pu.tenant_id
  WHERE t.slug = p_tenant_slug
    AND pu.is_active = TRUE
    AND (pu.pin_code = p_pin OR (pu.pin_hash IS NOT NULL AND pu.pin_hash = crypt(p_pin, pu.pin_hash)));
END;
$$;

INSERT INTO tenants (slug, name, abn)
VALUES ('trip2talk', 'Trip2Talk Australia · Chapter 99 Photography', 'XX XXX XXX XXX')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO pin_users (tenant_id, role, pin_code, display_name)
SELECT t.id, v.role::app_role, v.pin, v.name
FROM tenants t
CROSS JOIN (VALUES
  ('STAFF', '1111', 'Staff'),
  ('COHOST', '4444', 'Co-Host'),
  ('OWNER', '9999', 'Saen (Owner)'),
  ('PLATFORM_ADMIN', '3501', 'Platform Admin')
) AS v(role, pin, name)
WHERE t.slug = 'trip2talk'
ON CONFLICT (tenant_id, pin_code) DO NOTHING;
