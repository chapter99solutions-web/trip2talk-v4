-- Trip2Talk V4 — Waiver types (transport + portfolio rows)
ALTER TABLE client_waivers
  ADD COLUMN IF NOT EXISTS waiver_type TEXT NOT NULL DEFAULT 'core',
  ADD COLUMN IF NOT EXISTS agreed_transport BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_client_waivers_type ON client_waivers(client_id, tour_id, waiver_type);
