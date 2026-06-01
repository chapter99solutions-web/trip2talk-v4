-- ============================================================================
-- Storage bucket `portfolio` — public read for trip covers & gallery assets
-- ----------------------------------------------------------------------------
-- Run in Supabase SQL Editor (or: npx supabase db query --linked -f this file)
--
-- The PWA loads covers via /storage/v1/object/public/portfolio/... URLs and
-- lists folders with the anon key. Without SELECT policies, list() fails even
-- when the bucket is marked public.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anonymous read/list (required for TourCard cover resolve + gallery list)
DROP POLICY IF EXISTS "portfolio_anon_select" ON storage.objects;
CREATE POLICY "portfolio_anon_select" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'portfolio');

-- Authenticated staff uploads (optional; adjust role if you use a custom claim)
DROP POLICY IF EXISTS "portfolio_authenticated_insert" ON storage.objects;
CREATE POLICY "portfolio_authenticated_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio');

DROP POLICY IF EXISTS "portfolio_authenticated_update" ON storage.objects;
CREATE POLICY "portfolio_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'portfolio')
  WITH CHECK (bucket_id = 'portfolio');
