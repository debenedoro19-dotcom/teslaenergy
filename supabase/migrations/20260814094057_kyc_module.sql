-- KYC Module Migration
-- Creates kyc_submissions table, storage bucket policies, and RLS

-- 1. Types
DROP TYPE IF EXISTS public.kyc_status CASCADE;
CREATE TYPE public.kyc_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');

DROP TYPE IF EXISTS public.kyc_id_type CASCADE;
CREATE TYPE public.kyc_id_type AS ENUM ('passport', 'drivers_license', 'national_id');

-- 2. User profiles table (if not exists — needed for FK)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. KYC submissions table
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    -- Personal info
    date_of_birth DATE,
    country TEXT,
    street_address TEXT,
    city TEXT,
    zip_code TEXT,
    -- Identity
    id_type public.kyc_id_type DEFAULT 'passport'::public.kyc_id_type,
    id_number TEXT,
    id_document_url TEXT,
    id_document_back_url TEXT,
    -- Address proof
    address_proof_url TEXT,
    -- Income verification
    investor_type TEXT,
    annual_income TEXT,
    investment_experience TEXT,
    income_document_url TEXT,
    -- Status
    kyc_status public.kyc_status DEFAULT 'pending'::public.kyc_status,
    admin_notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user_id ON public.kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_status ON public.kyc_submissions(kyc_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kyc_submissions_unique_user ON public.kyc_submissions(user_id);

-- 5. Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin'
         OR au.raw_app_meta_data->>'role' = 'admin')
)
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 6. Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for user_profiles
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_full_access_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- 8. RLS Policies for kyc_submissions
DROP POLICY IF EXISTS "users_manage_own_kyc" ON public.kyc_submissions;
CREATE POLICY "users_manage_own_kyc"
ON public.kyc_submissions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_kyc" ON public.kyc_submissions;
CREATE POLICY "admin_full_access_kyc"
ON public.kyc_submissions
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- 9. Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_kyc_updated_at ON public.kyc_submissions;
CREATE TRIGGER update_kyc_updated_at
    BEFORE UPDATE ON public.kyc_submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Storage bucket policies (kyc-documents bucket)
-- Note: Bucket must be created via Supabase dashboard or API
-- These policies assume the bucket "kyc-documents" exists

DO $$
BEGIN
    -- Insert storage bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'kyc-documents',
        'kyc-documents',
        false,
        10485760, -- 10MB
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    )
    ON CONFLICT (id) DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Storage bucket creation skipped: %', SQLERRM;
END $$;

-- Storage RLS policies
DROP POLICY IF EXISTS "users_upload_own_kyc_docs" ON storage.objects;
CREATE POLICY "users_upload_own_kyc_docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "users_read_own_kyc_docs" ON storage.objects;
CREATE POLICY "users_read_own_kyc_docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "admin_read_all_kyc_docs" ON storage.objects;
CREATE POLICY "admin_read_all_kyc_docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents'
    AND public.is_admin_from_auth()
);

DROP POLICY IF EXISTS "users_delete_own_kyc_docs" ON storage.objects;
CREATE POLICY "users_delete_own_kyc_docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
