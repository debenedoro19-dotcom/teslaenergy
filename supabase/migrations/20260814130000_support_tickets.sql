-- Support Tickets Module
-- Creates support_tickets table with RLS policies

DROP TYPE IF EXISTS public.ticket_status CASCADE;
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

DROP TYPE IF EXISTS public.ticket_category CASCADE;
CREATE TYPE public.ticket_category AS ENUM ('account', 'investment', 'withdrawal', 'kyc', 'technical', 'other');

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category public.ticket_category DEFAULT 'other'::public.ticket_category,
  ticket_status public.ticket_status DEFAULT 'open'::public.ticket_status,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_reply TEXT,
  admin_notes TEXT,
  user_email TEXT NOT NULL,
  user_name TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(ticket_status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON public.support_tickets(ticket_number);

-- Auto-generate ticket numbers
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ticket_number := 'TT-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_support_ticket_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  IF NEW.ticket_status IN ('resolved', 'closed') AND OLD.ticket_status NOT IN ('resolved', 'closed') THEN
    NEW.resolved_at := CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_support_tickets" ON public.support_tickets;
CREATE POLICY "users_manage_own_support_tickets"
ON public.support_tickets
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_all_support_tickets" ON public.support_tickets;
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM public.user_profiles
  WHERE id = auth.uid() AND role = 'admin'
)
$$;

CREATE POLICY "admin_manage_all_support_tickets"
ON public.support_tickets
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP TRIGGER IF EXISTS set_ticket_number ON public.support_tickets;
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
  EXECUTE FUNCTION public.generate_ticket_number();

DROP TRIGGER IF EXISTS update_support_ticket_timestamp ON public.support_tickets;
CREATE TRIGGER update_support_ticket_timestamp
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_support_ticket_updated_at();
