-- Migration: Allow authenticated users to insert and update their own portfolio row
-- Fixes RLS error 42501 when users try to upsert their own portfolio (e.g. on deposit)

-- Users can insert their own portfolio row (user_id must match auth.uid())
DROP POLICY IF EXISTS "users_insert_own_portfolio" ON public.user_portfolios;
CREATE POLICY "users_insert_own_portfolio"
  ON public.user_portfolios
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own portfolio row
DROP POLICY IF EXISTS "users_update_own_portfolio" ON public.user_portfolios;
CREATE POLICY "users_update_own_portfolio"
  ON public.user_portfolios
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
