-- User Balance System
-- Standalone balance: deposit freely, receive investment returns, withdraw to wallet/bank

CREATE TABLE IF NOT EXISTS public.user_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  available_balance DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  total_deposited DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  total_withdrawn DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  total_returns DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_balance UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'investment_return', 'investment_debit')),
  amount DECIMAL(18, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  description TEXT,
  payment_method TEXT,
  wallet_address TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  reference TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.session_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  session_type TEXT NOT NULL DEFAULT 'virtual' CHECK (session_type IN ('virtual', 'in_person')),
  preferred_date TEXT,
  preferred_time TEXT,
  topics TEXT,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'confirmed', 'rejected')),
  amount DECIMAL(18, 2) NOT NULL DEFAULT 50000.00,
  crypto_tx_hash TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_balance_user_id ON public.user_balance(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_user_id ON public.balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_type ON public.balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_session_bookings_user_id ON public.session_bookings(user_id);

ALTER TABLE public.user_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_bookings ENABLE ROW LEVEL SECURITY;

-- user_balance policies
DROP POLICY IF EXISTS "users_manage_own_balance" ON public.user_balance;
CREATE POLICY "users_manage_own_balance"
ON public.user_balance FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_user_balance" ON public.user_balance;
CREATE POLICY "admin_full_access_user_balance"
ON public.user_balance FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
);

-- balance_transactions policies
DROP POLICY IF EXISTS "users_manage_own_balance_transactions" ON public.balance_transactions;
CREATE POLICY "users_manage_own_balance_transactions"
ON public.balance_transactions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_balance_transactions" ON public.balance_transactions;
CREATE POLICY "admin_full_access_balance_transactions"
ON public.balance_transactions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
);

-- session_bookings policies
DROP POLICY IF EXISTS "users_manage_own_session_bookings" ON public.session_bookings;
CREATE POLICY "users_manage_own_session_bookings"
ON public.session_bookings FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_session_bookings" ON public.session_bookings;
CREATE POLICY "admin_full_access_session_bookings"
ON public.session_bookings FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
);
