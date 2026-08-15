-- Migration: withdrawal_requests table for referral payout requests
-- Users submit withdrawal requests tied to their verified bank account

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  bank_name TEXT NOT NULL DEFAULT '',
  account_number TEXT NOT NULL DEFAULT '',
  account_name TEXT NOT NULL DEFAULT '',
  routing_number TEXT NOT NULL DEFAULT '',
  payout_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- payout_status values: 'pending', 'processing', 'paid', 'rejected'

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(payout_status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_email ON public.withdrawal_requests(user_email);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_withdrawal_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_requests_updated_at ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_withdrawal_requests_updated_at();

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own withdrawal requests
DROP POLICY IF EXISTS "users_read_own_withdrawals" ON public.withdrawal_requests;
CREATE POLICY "users_read_own_withdrawals"
  ON public.withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own withdrawal requests
DROP POLICY IF EXISTS "users_insert_own_withdrawals" ON public.withdrawal_requests;
CREATE POLICY "users_insert_own_withdrawals"
  ON public.withdrawal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all withdrawal requests
DROP POLICY IF EXISTS "admin_manage_all_withdrawals" ON public.withdrawal_requests;
CREATE POLICY "admin_manage_all_withdrawals"
  ON public.withdrawal_requests
  FOR ALL
  TO authenticated
  USING (public.is_portfolio_admin())
  WITH CHECK (public.is_portfolio_admin());
