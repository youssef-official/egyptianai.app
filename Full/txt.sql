-- Consolidated schema
BEGIN;

-- 20251020063204_9069d954-73ff-4e98-adaa-3a7dd6fd6c04.sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user types
CREATE TYPE user_type AS ENUM ('user', 'doctor');

-- Create enum for transaction types
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdraw', 'consultation', 'transfer');

-- Create enum for request status
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  referral_source TEXT,
  user_type user_type NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create wallets table
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create medical departments table
CREATE TABLE medical_departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create doctors table
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES medical_departments(id),
  specialization_ar TEXT NOT NULL,
  specialization_en TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  whatsapp_number TEXT NOT NULL,
  bio_ar TEXT,
  bio_en TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  doctor_id UUID REFERENCES doctors(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  type transaction_type NOT NULL,
  description TEXT,
  receiver_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create deposit requests table
CREATE TABLE deposit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL,
  proof_image_url TEXT NOT NULL,
  status request_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create withdraw requests table
CREATE TABLE withdraw_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  net_amount DECIMAL(10,2) NOT NULL CHECK (net_amount > 0),
  commission DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status request_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table for admin
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'doctor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdraw_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for wallets
CREATE POLICY "Users can view their own wallet"
  ON wallets FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own wallet"
  ON wallets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for medical_departments
CREATE POLICY "Anyone can view departments"
  ON medical_departments FOR SELECT
  USING (true);

-- RLS Policies for doctors
CREATE POLICY "Anyone can view active doctors"
  ON doctors FOR SELECT
  USING (is_active = true OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can update their own profile"
  ON doctors FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (
    user_id = auth.uid() OR 
    receiver_id = auth.uid() OR 
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "System can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for deposit_requests
CREATE POLICY "Users can view their own deposit requests"
  ON deposit_requests FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create deposit requests"
  ON deposit_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for withdraw_requests
CREATE POLICY "Doctors can view their own withdraw requests"
  ON withdraw_requests FOR SELECT
  USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Doctors can create withdraw requests"
  ON withdraw_requests FOR INSERT
  WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'user')
  );
  
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deposit_requests_updated_at
  BEFORE UPDATE ON deposit_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdraw_requests_updated_at
  BEFORE UPDATE ON withdraw_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial medical departments
INSERT INTO medical_departments (name_ar, name_en, icon) VALUES
  ('باطنة', 'Internal Medicine', '🩺'),
  ('عيون', 'Ophthalmology', '👁️'),
  ('أنف وأذن وحنجرة', 'ENT', '👂'),
  ('جلدية', 'Dermatology', '🧴'),
  ('أطفال', 'Pediatrics', '👶'),
  ('نساء وتوليد', 'Gynecology', '🤰'),
  ('عظام', 'Orthopedics', '🦴'),
  ('قلب وأوعية دموية', 'Cardiology', '❤️'),
  ('أسنان', 'Dentistry', '🦷'),
  ('نفسية', 'Psychiatry', '🧠');

-- 20251021190552_75b9a8ee-e554-4054-8fda-be90336e452a.sql
-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile images
CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile image"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile image"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile image"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add avatar_url to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Update wallets RLS to allow system updates
DROP POLICY IF EXISTS "System can update wallets" ON wallets;
CREATE POLICY "System can update wallets"
ON wallets FOR UPDATE
USING (true)
WITH CHECK (true);

-- Update deposit_requests to allow admin updates
DROP POLICY IF EXISTS "Admins can update deposit requests" ON deposit_requests;
CREATE POLICY "Admins can update deposit requests"
ON deposit_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Update withdraw_requests to allow admin updates
DROP POLICY IF EXISTS "Admins can update withdraw requests" ON withdraw_requests;
CREATE POLICY "Admins can update withdraw requests"
ON withdraw_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow admins to delete users
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
CREATE POLICY "Admins can manage profiles"
ON profiles FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 20251022051834_085c6d91-2c0b-4287-915b-30b946ab9a77.sql
-- Create deposit proof storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('deposit-proofs', 'deposit-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for deposit proofs
CREATE POLICY "Users can upload their own deposit proofs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'deposit-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own deposit proofs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'deposit-proofs' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin')));

CREATE POLICY "Admins can view all deposit proofs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'deposit-proofs' AND has_role(auth.uid(), 'admin'));

-- Add verification fields to doctors table
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verification_requested_at timestamp with time zone;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_fee numeric;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS doctor_name text;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS address text;

-- Update doctors RLS policies
DROP POLICY IF EXISTS "Anyone can view active doctors" ON doctors;
CREATE POLICY "Anyone can view active doctors"
ON doctors
FOR SELECT
USING (
  (is_active = true) 
  OR (user_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin')
);

-- 20251022052952_d7a12d18-14fd-4bc5-a9ed-567c85747692.sql
-- Fix RLS policies for doctors table to allow inserts
DROP POLICY IF EXISTS "Doctors can create their profile" ON public.doctors;

CREATE POLICY "Doctors can create their profile"
ON public.doctors
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Update withdraw_requests to ensure doctor_id is properly set
DROP POLICY IF EXISTS "Doctors can create withdraw requests" ON public.withdraw_requests;

CREATE POLICY "Doctors can create withdraw requests"
ON public.withdraw_requests
FOR INSERT
WITH CHECK (
  doctor_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  )
);

-- 20251026181602_d50b3d9e-6ec5-473a-aa2d-7786346b3a52.sql
-- Create consultations table to track all consultations
CREATE TABLE IF NOT EXISTS public.consultations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  department_id UUID REFERENCES public.medical_departments(id),
  status TEXT DEFAULT 'active'
);

-- Enable RLS
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own consultations"
ON public.consultations
FOR SELECT
USING (user_id = auth.uid() OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert consultations"
ON public.consultations
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Create doctor_requests table for doctor applications
CREATE TABLE IF NOT EXISTS public.doctor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  specialization TEXT NOT NULL,
  certificate_url TEXT NOT NULL,
  id_card_front_url TEXT NOT NULL,
  id_card_back_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctor_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own doctor request"
ON public.doctor_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own doctor request"
ON public.doctor_requests
FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update doctor requests"
ON public.doctor_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create trigger for doctor_requests updated_at
CREATE TRIGGER update_doctor_requests_updated_at
BEFORE UPDATE ON public.doctor_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for doctor documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('doctor-documents', 'doctor-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for doctor documents
CREATE POLICY "Users can upload their doctor documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'doctor-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own doctor documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'doctor-documents' 
  AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Admins can delete doctor documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'doctor-documents' 
  AND has_role(auth.uid(), 'admin')
);

-- 20251027090000_security_rpcs_and_email.sql
-- Add email column to profiles if missing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Update handle_new_user trigger function to store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  RETURN NEW;
END;
$$;

-- Tighten wallets UPDATE RLS: remove permissive policy and restrict
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'wallets' AND policyname = 'System can update wallets'
  ) THEN
    DROP POLICY "System can update wallets" ON public.wallets;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'wallets' AND policyname = 'Users/admins can update wallet'
  ) THEN
    CREATE POLICY "Users/admins can update wallet"
    ON public.wallets
    FOR UPDATE
    USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Restrict doctor profile creation to approved requests only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'doctors' AND policyname = 'Doctors can create their profile'
  ) THEN
    DROP POLICY "Doctors can create their profile" ON public.doctors;
  END IF;
END $$;

CREATE POLICY "Approved doctors can create profile"
ON public.doctors
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.doctor_requests dr
    WHERE dr.user_id = auth.uid() AND dr.status = 'approved'
  )
);

-- Allow admins to update doctors (e.g., toggle verification)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'doctors' AND policyname = 'Admins can update doctors'
  ) THEN
    CREATE POLICY "Admins can update doctors"
    ON public.doctors
    FOR UPDATE
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Helper to generate operation ids
CREATE OR REPLACE FUNCTION public.generate_op_id(prefix text)
RETURNS text
LANGUAGE SQL
AS $$
  SELECT prefix || (extract(epoch FROM now())::bigint)::text || lpad((floor(random()*1000))::int::text, 3, '0')
$$;

-- Secure procedure to perform a consultation transaction atomically
CREATE OR REPLACE FUNCTION public.perform_consultation(_doctor_id uuid)
RETURNS TABLE(tx_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _fee numeric;
  _doctor_user_id uuid;
  _dept_id uuid;
  _tx text;
  _user_balance numeric;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(d.consultation_fee, d.price), d.user_id, d.department_id
    INTO _fee, _doctor_user_id, _dept_id
  FROM public.doctors d
  WHERE d.id = _doctor_id AND d.is_active = true;

  IF _fee IS NULL THEN
    RAISE EXCEPTION 'Doctor not found or inactive';
  END IF;

  SELECT balance INTO _user_balance FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF _user_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  IF _user_balance < _fee THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Lock doctor wallet row as well
  PERFORM 1 FROM public.wallets WHERE user_id = _doctor_user_id FOR UPDATE;

  UPDATE public.wallets SET balance = balance - _fee WHERE user_id = _user_id;
  UPDATE public.wallets SET balance = balance + _fee WHERE user_id = _doctor_user_id;

  _tx := public.generate_op_id('CS');

  INSERT INTO public.transactions(id, user_id, doctor_id, amount, type, description)
  VALUES (_tx, _user_id, _doctor_id, _fee, 'consultation', 'استشارة');

  INSERT INTO public.consultations(id, user_id, doctor_id, amount, department_id, status)
  VALUES (_tx, _user_id, _doctor_id, _fee, _dept_id, 'active');

  RETURN QUERY SELECT _tx;
END;
$$;

GRANT EXECUTE ON FUNCTION public.perform_consultation(uuid) TO anon, authenticated;

-- Secure procedure to perform a wallet transfer
CREATE OR REPLACE FUNCTION public.perform_transfer(_receiver_id uuid, _amount numeric)
RETURNS TABLE(tx_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender_id uuid := auth.uid();
  _tx text;
  _sender_balance numeric;
BEGIN
  IF _sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _receiver_id IS NULL OR _receiver_id = _sender_id THEN
    RAISE EXCEPTION 'Invalid receiver';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  -- Lock both wallets
  SELECT balance INTO _sender_balance FROM public.wallets WHERE user_id = _sender_id FOR UPDATE;
  IF _sender_balance IS NULL THEN RAISE EXCEPTION 'Sender wallet not found'; END IF;
  IF _sender_balance < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  PERFORM 1 FROM public.wallets WHERE user_id = _receiver_id FOR UPDATE;

  UPDATE public.wallets SET balance = balance - _amount WHERE user_id = _sender_id;
  UPDATE public.wallets SET balance = balance + _amount WHERE user_id = _receiver_id;

  _tx := public.generate_op_id('TR');
  INSERT INTO public.transactions(id, user_id, receiver_id, amount, type, description)
  VALUES (_tx, _sender_id, _receiver_id, _amount, 'transfer', 'تحويل رصيد');

  RETURN QUERY SELECT _tx;
END;
$$;

GRANT EXECUTE ON FUNCTION public.perform_transfer(uuid, numeric) TO anon, authenticated;

-- Reports table for doctors
CREATE TABLE IF NOT EXISTS public.doctor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_reports ENABLE ROW LEVEL SECURITY;

-- Policies: user can insert, admins and doctor owner can read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'doctor_reports' AND policyname = 'Users can create reports'
  ) THEN
    CREATE POLICY "Users can create reports"
    ON public.doctor_reports FOR INSERT
    WITH CHECK (reporter_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'doctor_reports' AND policyname = 'Admins/owners can read reports'
  ) THEN
    CREATE POLICY "Admins/owners can read reports"
    ON public.doctor_reports FOR SELECT
    USING (
      has_role(auth.uid(), 'admin') OR 
      doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    );
  END IF;
END $$;


-- 20251028100000_chat_and_agora.sql
-- Chat and availability schema for Agora-powered consultations

-- Doctor availability/status columns
ALTER TABLE public.doctors 
  ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_busy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_session_id text;

-- Chat sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id text PRIMARY KEY,
  consultation_id text REFERENCES public.consultations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('queued','active','ended','closed')) DEFAULT 'queued',
  queue_position integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Participants can view their sessions; admins too
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'chat_sessions' AND policyname = 'Participants can view sessions'
  ) THEN
    CREATE POLICY "Participants can view sessions"
    ON public.chat_sessions FOR SELECT
    USING (
      user_id = auth.uid() OR 
      doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()) OR 
      has_role(auth.uid(), 'admin')
    );
  END IF;
END $$;

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id bigserial PRIMARY KEY,
  session_id text NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','doctor','system')),
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','audio','video','system')),
  content text,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Participants can read/write messages in their session
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Participants can read messages'
  ) THEN
    CREATE POLICY "Participants can read messages"
    ON public.chat_messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.chat_sessions s
        WHERE s.id = session_id AND (
          s.user_id = auth.uid() OR 
          s.doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()) OR 
          has_role(auth.uid(), 'admin')
        )
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Participants can insert messages'
  ) THEN
    CREATE POLICY "Participants can insert messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.chat_sessions s
        WHERE s.id = session_id AND (
          s.user_id = auth.uid() OR 
          s.doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
        )
      )
    );
  END IF;
END $$;

-- Storage bucket for chat uploads (images/audio)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Public read, authenticated write policy for chat-uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read chat uploads'
  ) THEN
    CREATE POLICY "Public read chat uploads"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'chat-uploads');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can upload chat files'
  ) THEN
    CREATE POLICY "Authenticated can upload chat files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'chat-uploads' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- Helper: generate id with prefix
CREATE OR REPLACE FUNCTION public.generate_chat_id()
RETURNS text LANGUAGE SQL AS $$
  SELECT 'CH' || (extract(epoch FROM now())::bigint)::text || lpad((floor(random()*1000))::int::text, 3, '0')
$$;

-- RPC: user requests a chat with a doctor after payment
CREATE OR REPLACE FUNCTION public.request_chat(_doctor_id uuid, _consultation_id text)
RETURNS TABLE(session_id text, queue_position integer, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid := auth.uid();
  _sid text;
  _pos integer := 0;
  _doc_user uuid;
  _is_online boolean;
  _is_busy boolean;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- verify consultation belongs to user and matches doctor
  IF NOT EXISTS (
    SELECT 1 FROM public.consultations c WHERE c.id = _consultation_id AND c.user_id = _user_id AND c.doctor_id = _doctor_id AND c.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Invalid consultation';
  END IF;

  SELECT user_id, is_online, is_busy INTO _doc_user, _is_online, _is_busy FROM public.doctors WHERE id = _doctor_id;
  IF _doc_user IS NULL THEN RAISE EXCEPTION 'Doctor not found'; END IF;
  IF NOT _is_online THEN RETURN QUERY SELECT NULL::text, NULL::int, 'offline'::text; RETURN; END IF;

  _sid := public.generate_chat_id();

  IF _is_busy THEN
    SELECT COALESCE(MAX(queue_position), 0) + 1 INTO _pos FROM public.chat_sessions WHERE doctor_id = _doctor_id AND status = 'queued';
    INSERT INTO public.chat_sessions(id, consultation_id, user_id, doctor_id, status, queue_position)
    VALUES (_sid, _consultation_id, _user_id, _doctor_id, 'queued', _pos);
    RETURN QUERY SELECT _sid, _pos, 'queued'::text;
  ELSE
    INSERT INTO public.chat_sessions(id, consultation_id, user_id, doctor_id, status, started_at)
    VALUES (_sid, _consultation_id, _user_id, _doctor_id, 'active', now());
    UPDATE public.doctors SET is_busy = true, current_session_id = _sid WHERE id = _doctor_id;
    RETURN QUERY SELECT _sid, 0, 'active'::text;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_chat(uuid, text) TO anon, authenticated;

-- RPC: doctor toggles online state
CREATE OR REPLACE FUNCTION public.doctor_set_online(_is_online boolean)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _doc_id uuid;
BEGIN
  SELECT id INTO _doc_id FROM public.doctors WHERE user_id = auth.uid();
  IF _doc_id IS NULL THEN RAISE EXCEPTION 'Not a doctor'; END IF;

  UPDATE public.doctors 
  SET is_online = _is_online,
      is_busy = CASE WHEN _is_online THEN is_busy ELSE false END,
      current_session_id = CASE WHEN _is_online THEN current_session_id ELSE NULL END
  WHERE id = _doc_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.doctor_set_online(boolean) TO authenticated;

-- RPC: doctor ends current session and auto-takes next if exists
CREATE OR REPLACE FUNCTION public.doctor_end_session()
RETURNS TABLE(new_session_id text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _doc_id uuid;
  _curr text;
  _next text;
BEGIN
  SELECT id, current_session_id INTO _doc_id, _curr FROM public.doctors WHERE user_id = auth.uid();
  IF _doc_id IS NULL THEN RAISE EXCEPTION 'Not a doctor'; END IF;

  IF _curr IS NOT NULL THEN
    UPDATE public.chat_sessions SET status = 'ended', ended_at = now() WHERE id = _curr AND doctor_id = _doc_id;
  END IF;

  SELECT id INTO _next FROM public.chat_sessions 
  WHERE doctor_id = _doc_id AND status = 'queued'
  ORDER BY queue_position NULLS FIRST, created_at
  LIMIT 1;

  IF _next IS NOT NULL THEN
    UPDATE public.chat_sessions SET status = 'active', started_at = now() WHERE id = _next;
    UPDATE public.doctors SET is_busy = true, current_session_id = _next WHERE id = _doc_id;
    RETURN QUERY SELECT _next;
  ELSE
    UPDATE public.doctors SET is_busy = false, current_session_id = NULL WHERE id = _doc_id;
    RETURN QUERY SELECT NULL::text;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.doctor_end_session() TO authenticated;


-- 20251028102000_chat_call_status.sql
-- Add call status/type to chat sessions and RPCs for call flow

ALTER TABLE public.chat_sessions 
  ADD COLUMN IF NOT EXISTS call_status text NOT NULL DEFAULT 'none' CHECK (call_status IN ('none','requested','accepted','rejected')),
  ADD COLUMN IF NOT EXISTS call_type text CHECK (call_type IN ('audio','video'));

-- User requests a call (audio/video)
CREATE OR REPLACE FUNCTION public.user_request_call(_session_id text, _call_type text)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _u uuid := auth.uid();
  _doc_id uuid;
  _is_online boolean;
  _status text;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _call_type NOT IN ('audio','video') THEN RAISE EXCEPTION 'Invalid call type'; END IF;

  SELECT s.doctor_id, d.is_online, s.status
  INTO _doc_id, _is_online, _status
  FROM public.chat_sessions s
  JOIN public.doctors d ON d.id = s.doctor_id
  WHERE s.id = _session_id AND s.user_id = _u;

  IF _doc_id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF NOT _is_online THEN RAISE EXCEPTION 'Doctor offline'; END IF;
  IF _status <> 'active' THEN RAISE EXCEPTION 'Session not active'; END IF;

  UPDATE public.chat_sessions
  SET call_status = 'requested', call_type = _call_type
  WHERE id = _session_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.user_request_call(text, text) TO authenticated;

-- Doctor responds to a call request
CREATE OR REPLACE FUNCTION public.doctor_respond_call(_session_id text, _accept boolean)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _doc_id uuid;
BEGIN
  SELECT id INTO _doc_id FROM public.doctors WHERE user_id = auth.uid();
  IF _doc_id IS NULL THEN RAISE EXCEPTION 'Not a doctor'; END IF;

  -- Ensure session belongs to doctor and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_sessions WHERE id = _session_id AND doctor_id = _doc_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Session not found or inactive';
  END IF;

  UPDATE public.chat_sessions
  SET call_status = CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END
  WHERE id = _session_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.doctor_respond_call(text, boolean) TO authenticated;


COMMIT;
