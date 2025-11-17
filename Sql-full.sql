-- =============================================================================
-- Cura-Verse Full Database Schema
-- This script is idempotent and can be run multiple times.
-- =============================================================================

-- =============================================================================
-- Section 1: Custom Types (ENUMs)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE public.user_type AS ENUM ('user', 'doctor', 'hospital');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END
$$;

-- =============================================================================
-- Section 2: Core Tables
-- =============================================================================

-- Profiles Table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  user_type public.user_type DEFAULT 'user'::public.user_type,
  email text UNIQUE
);
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user.';

-- Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance numeric(10, 2) NOT NULL DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.wallets IS 'Stores the balance for each user.';

-- User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'user', 'doctor', 'hospital')),
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.user_roles IS 'Assigns roles to users for permission control.';

-- Medical Departments Table
CREATE TABLE IF NOT EXISTS public.medical_departments (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name_ar text NOT NULL,
  name_en text
);
COMMENT ON TABLE public.medical_departments IS 'List of medical departments/specialties.';

-- Doctors Table
CREATE TABLE IF NOT EXISTS public.doctors (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_name text,
  department_id bigint REFERENCES public.medical_departments(id),
  specialization_ar text,
  specialization_en text,
  price numeric(10, 2),
  consultation_fee numeric(10, 2),
  whatsapp_number text,
  phone_number text,
  address text,
  image_url text,
  is_active boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  verification_requested_at timestamptz,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.doctors IS 'Stores detailed information about doctors.';

-- Hospitals Table
CREATE TABLE IF NOT EXISTS public.hospitals (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text,
  email text,
  phone text,
  logo_url text,
  is_approved boolean DEFAULT false,
  is_active boolean DEFAULT false,
  status text,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.hospitals IS 'Stores information about registered hospitals.';

-- Hospital Doctors Table
CREATE TABLE IF NOT EXISTS public.hospital_doctors (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  hospital_id bigint NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  doctor_name text,
  specialization text,
  consultation_price numeric(10, 2),
  is_available boolean DEFAULT true
);
COMMENT ON TABLE public.hospital_doctors IS 'Stores information about doctors available at specific hospitals.';

-- =============================================================================
-- Section 3: Request & Transaction Tables
-- =============================================================================

-- Deposit Requests Table
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  payment_method text,
  proof_image_url text,
  status public.request_status DEFAULT 'pending'::public.request_status,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.deposit_requests ALTER COLUMN proof_image_url DROP NOT NULL;
COMMENT ON TABLE public.deposit_requests IS 'Stores user deposit requests for admin approval.';

-- Withdraw Requests Table
CREATE TABLE IF NOT EXISTS public.withdraw_requests (
  id text PRIMARY KEY,
  doctor_id bigint NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  net_amount numeric(10, 2),
  commission numeric(10, 2),
  status public.request_status DEFAULT 'pending'::public.request_status,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.withdraw_requests IS 'Stores doctor withdrawal requests.';

-- Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  type text,
  description text,
  created_at timestamptz DEFAULT now(),
  receiver_id uuid REFERENCES public.profiles(id),
  doctor_id bigint REFERENCES public.doctors(id)
);
COMMENT ON TABLE public.transactions IS 'Logs all financial transactions in the system.';

-- Consultations Table
CREATE TABLE IF NOT EXISTS public.consultations (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id bigint NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  price numeric(10, 2),
  amount numeric(10, 2),
  is_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.consultations IS 'Records consultation sessions between users and doctors.';

-- Hospital Bookings Table
CREATE TABLE IF NOT EXISTS public.hospital_bookings (
  id text PRIMARY KEY,
  hospital_id bigint NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id bigint REFERENCES public.hospital_doctors(id),
  patient_name text,
  patient_phone text,
  patient_area text,
  doctor_name text,
  specialization text,
  price numeric(10, 2),
  is_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.hospital_bookings IS 'Stores booking information for hospital services.';

-- Doctor Requests Table
CREATE TABLE IF NOT EXISTS public.doctor_requests (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  specialization text,
  certificate_url text,
  id_card_front_url text,
  id_card_back_url text,
  status public.request_status DEFAULT 'pending'::public.request_status,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.doctor_requests IS 'Stores applications from users wanting to become doctors.';

-- Hospital Requests Table
CREATE TABLE IF NOT EXISTS public.hospital_requests (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hospital_name text,
  phone text,
  email text,
  logo_url text,
  ownership_docs_url text,
  status public.request_status DEFAULT 'pending'::public.request_status,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);
COMMENT ON TABLE public.hospital_requests IS 'Stores applications from users to register their hospital.';

-- Doctor Reports Table
CREATE TABLE IF NOT EXISTS public.doctor_reports (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id),
  doctor_id bigint NOT NULL REFERENCES public.doctors(id),
  message text,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.doctor_reports IS 'Stores reports filed against doctors by users.';


-- =============================================================================
-- Section 4: Functions and Triggers
-- =============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, user_type, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'user'),
    NEW.email
  );

  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00);

  IF COALESCE((NEW.raw_user_meta_data->>'user_type')::text, 'user') = 'hospital' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'hospital');
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger for handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to approve/reject hospital requests
CREATE OR REPLACE FUNCTION public.approve_hospital_request(
  _request_id bigint,
  _approve boolean,
  _notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_data hospital_requests;
BEGIN
  UPDATE public.hospital_requests
  SET
    status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
    admin_notes = _notes,
    updated_at = now()
  WHERE id = _request_id
  RETURNING * INTO request_data;

  IF _approve THEN
    INSERT INTO public.hospitals (user_id, name, phone, email, logo_url, is_approved)
    VALUES (
      request_data.user_id,
      request_data.hospital_name,
      request_data.phone,
      request_data.email,
      request_data.logo_url,
      true
    );
  END IF;
END;
$$;

-- =============================================================================
-- Section 5: Row Level Security (RLS)
-- =============================================================================

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own wallet." ON public.wallets;
CREATE POLICY "Users can view their own wallet." ON public.wallets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own hospital request" ON public.hospital_requests;
CREATE POLICY "Users can create their own hospital request" ON public.hospital_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT INSERT ON public.hospital_requests TO authenticated;

-- =============================================================================
-- Section 6: Storage
-- =============================================================================

-- Create Buckets if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'doctor-documents') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('doctor-documents', 'doctor-documents', false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'hospital-documents') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('hospital-documents', 'hospital-documents', false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'deposit-proofs') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('deposit-proofs', 'deposit-proofs', false);
  END IF;
END
$$;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Authenticated users can upload to hospital-documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload to hospital-documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'hospital-documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can view all hospital documents" ON storage.objects;
CREATE POLICY "Admins can view all hospital documents" ON storage.objects FOR SELECT USING (bucket_id = 'hospital-documents' AND (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- =============================================================================
-- End of Script
-- =============================================================================
