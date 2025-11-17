-- Create storage bucket for hospital documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('hospital-documents', 'hospital-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Hospitals can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Hospitals can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all hospital documents" ON storage.objects;

-- Create storage policies for hospital documents
CREATE POLICY "Hospitals can upload their own documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'hospital-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Hospitals can view their own documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'hospital-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all hospital documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'hospital-documents' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Fix the new user trigger to properly create profiles for all user types
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile for all new users
  INSERT INTO public.profiles (
    id, 
    full_name, 
    phone, 
    email,
    referral_source, 
    user_type
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'referral_source',
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'user'::user_type)
  );

  -- Create wallet for non-hospital users
  IF COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'user'::user_type) != 'hospital'::user_type THEN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();