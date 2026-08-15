-- Migration: Add deposit_records table for admin deposit management
-- Timestamp: 20260815040000

CREATE TABLE IF NOT EXISTS public.deposit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL DEFAULT '',
  user_name TEXT NOT NULL DEFAULT '',
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  package_name TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL DEFAULT '',
  tx_ref TEXT NOT NULL DEFAULT '',
  deposit_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deposit_records_user_id ON public.deposit_records(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_records_status ON public.deposit_records(deposit_status);
CREATE INDEX IF NOT EXISTS idx_deposit_records_created_at ON public.deposit_records(created_at DESC);

ALTER TABLE public.deposit_records ENABLE ROW LEVEL SECURITY;

-- Users can view and insert their own deposits
DROP POLICY IF EXISTS "users_view_own_deposits" ON public.deposit_records;
CREATE POLICY "users_view_own_deposits"
ON public.deposit_records
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own_deposits" ON public.deposit_records;
CREATE POLICY "users_insert_own_deposits"
ON public.deposit_records
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admin full access via auth metadata
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
      OR au.email = 'admin@teslatrade.com'
    )
  )
$$;

DROP POLICY IF EXISTS "admin_full_access_deposits" ON public.deposit_records;
CREATE POLICY "admin_full_access_deposits"
ON public.deposit_records
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());
