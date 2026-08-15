-- site_settings: key-value store for admin-configurable platform settings
-- Covers: crypto wallet addresses, giveaway entries, and future settings

CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_settings_key ON public.site_settings(key);

-- Function to check admin role from auth metadata (avoids recursion on user_profiles)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_app_meta_data->>'role' = 'admin'
    )
  )
$$;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public can read all settings (needed for crypto payment page and homepage)
DROP POLICY IF EXISTS "public_read_site_settings" ON public.site_settings;
CREATE POLICY "public_read_site_settings"
  ON public.site_settings
  FOR SELECT
  TO public
  USING (true);

-- Only admins can insert/update/delete settings
DROP POLICY IF EXISTS "admin_write_site_settings" ON public.site_settings;
CREATE POLICY "admin_write_site_settings"
  ON public.site_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Seed default crypto wallet addresses
INSERT INTO public.site_settings (key, value) VALUES
  ('crypto_wallets', jsonb_build_object(
    'btc', '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf6',
    'eth', '0x742d35Cc6634C0532925a3b8D4C9C4e8b1e2F3A4',
    'usdt', 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE'
  ))
ON CONFLICT (key) DO NOTHING;

-- Seed default giveaway entries
INSERT INTO public.site_settings (key, value) VALUES
  ('giveaways', jsonb_build_array(
    jsonb_build_object(
      'id', 1,
      'title', 'Win a 2025 Model 3 Long Range',
      'description', '2025 Tesla Model 3 Long Range AWD. One winner selected after campaign ends. Includes standard delivery within the continental US.',
      'prize', '2025 Tesla Model 3 Long Range AWD',
      'ends', '2026-12-31',
      'entryFee', 'Free with any inventory inquiry',
      'entries', 1247,
      'maxEntries', 5000,
      'badge', 'FREE ENTRY'
    ),
    jsonb_build_object(
      'id', 2,
      'title', 'Cybertruck Experience Weekend',
      'description', 'Win a full weekend with a Cybertruck Foundation Series plus a $2,000 platform credit toward any purchase.',
      'prize', 'Cybertruck Foundation Series + $2,000 credit',
      'ends', '2026-10-15',
      'entryFee', '$25 entry',
      'entries', 683,
      'maxEntries', 2000,
      'badge', '$25 ENTRY'
    )
  ))
ON CONFLICT (key) DO NOTHING;
