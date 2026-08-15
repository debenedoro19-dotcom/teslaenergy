-- Migration: user_portfolios table for real-time dashboard sync
-- Stores portfolio data managed by admin, read by users in real-time

CREATE TABLE IF NOT EXISTS public.user_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  stats JSONB NOT NULL DEFAULT '{
    "totalPortfolio": "$0",
    "activeInvestments": 0,
    "totalReturns": "$0",
    "referralEarnings": "$0",
    "portfolioChange": "$0 (0%)",
    "returnsChange": "$0 this month"
  }'::jsonb,
  chart_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  allocation JSONB NOT NULL DEFAULT '[]'::jsonb,
  investments JSONB NOT NULL DEFAULT '[]'::jsonb,
  transactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
  referrals JSONB NOT NULL DEFAULT '{
    "total": 0,
    "pending": 0,
    "earnings": "$0",
    "history": []
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_portfolios_user_id ON public.user_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_email ON public.user_portfolios(user_email);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.update_user_portfolios_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_portfolios_updated_at ON public.user_portfolios;
CREATE TRIGGER trg_user_portfolios_updated_at
  BEFORE UPDATE ON public.user_portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_portfolios_updated_at();

-- Enable RLS
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;

-- Users can read their own portfolio
DROP POLICY IF EXISTS "users_read_own_portfolio" ON public.user_portfolios;
CREATE POLICY "users_read_own_portfolio"
  ON public.user_portfolios
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin function to check admin role (using auth metadata to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_portfolio_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM public.user_profiles up
  WHERE up.id = auth.uid() AND up.role = 'admin'
)
$$;

-- Admins can do everything
DROP POLICY IF EXISTS "admin_manage_all_portfolios" ON public.user_portfolios;
CREATE POLICY "admin_manage_all_portfolios"
  ON public.user_portfolios
  FOR ALL
  TO authenticated
  USING (public.is_portfolio_admin())
  WITH CHECK (public.is_portfolio_admin());
