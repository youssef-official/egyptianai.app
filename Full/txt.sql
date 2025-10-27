-- Full SQL bootstrap for all schema objects (idempotent as much as possible)
-- Note: Some CREATE POLICY IF NOT EXISTS is not supported on older Postgres.
-- We use DO blocks to guard creations to avoid 42601 near NOT.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE user_type AS ENUM ('user', 'doctor');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM ('deposit', 'withdraw', 'consultation', 'transfer');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  referral_source TEXT,
  user_type user_type NOT NULL DEFAULT 'user',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medical_departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctors (
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
  is_verified BOOLEAN DEFAULT false,
  verification_requested_at TIMESTAMPTZ,
  phone_number TEXT,
  consultation_fee NUMERIC,
  doctor_name TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  doctor_id UUID REFERENCES doctors(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  type transaction_type NOT NULL,
  description TEXT,
  receiver_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deposit_requests (
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

CREATE TABLE IF NOT EXISTS withdraw_requests (
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

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'doctor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS consultations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  department_id UUID REFERENCES public.medical_departments(id),
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS doctor_requests (
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

CREATE TABLE IF NOT EXISTS doctor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_wallets_updated_at'
  ) THEN
    CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_doctors_updated_at'
  ) THEN
    CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_deposit_requests_updated_at'
  ) THEN
    CREATE TRIGGER update_deposit_requests_updated_at BEFORE UPDATE ON deposit_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_withdraw_requests_updated_at'
  ) THEN
    CREATE TRIGGER update_withdraw_requests_updated_at BEFORE UPDATE ON withdraw_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- RLS enable
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdraw_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_reports ENABLE ROW LEVEL SECURITY;

-- Role check function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- Policies (guard creations where IF NOT EXISTS unsupported)
-- profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- wallets
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wallets' AND policyname='Users can view their own wallet'
  ) THEN
    CREATE POLICY "Users can view their own wallet" ON wallets FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wallets' AND policyname='Users/admins can update wallet'
  ) THEN
    CREATE POLICY "Users/admins can update wallet" ON wallets FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wallets' AND policyname='Users can insert their own wallet'
  ) THEN
    CREATE POLICY "Users can insert their own wallet" ON wallets FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- medical_departments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='medical_departments' AND policyname='Anyone can view departments'
  ) THEN
    CREATE POLICY "Anyone can view departments" ON medical_departments FOR SELECT USING (true);
  END IF;
END $$;

-- doctors
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='doctors' AND policyname='Anyone can view active doctors'
  ) THEN
    CREATE POLICY "Anyone can view active doctors" ON doctors FOR SELECT USING (is_active = true OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='doctors' AND policyname='Doctors can update their own profile'
  ) THEN
    CREATE POLICY "Doctors can update their own profile" ON doctors FOR UPDATE USING (user_id = auth.uid());
  END IF;
  -- Admins can update doctors
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='doctors' AND policyname='Admins can update doctors'
  ) THEN
    CREATE POLICY "Admins can update doctors" ON doctors FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- transactions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='Users can view their own transactions'
  ) THEN
    CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (
      user_id = auth.uid() OR receiver_id = auth.uid() OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='System can insert transactions'
  ) THEN
    CREATE POLICY "System can insert transactions" ON transactions FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- deposit_requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='deposit_requests' AND policyname='Users can view their own deposit requests'
  ) THEN
    CREATE POLICY "Users can view their own deposit requests" ON deposit_requests FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='deposit_requests' AND policyname='Users can create deposit requests'
  ) THEN
    CREATE POLICY "Users can create deposit requests" ON deposit_requests FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  -- Admins can update deposit requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='deposit_requests' AND policyname='Admins can update deposit requests'
  ) THEN
    CREATE POLICY "Admins can update deposit requests" ON deposit_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- withdraw_requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='withdraw_requests' AND policyname='Doctors can view their own withdraw requests'
  ) THEN
    CREATE POLICY "Doctors can view their own withdraw requests" ON withdraw_requests FOR SELECT USING (
      doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='withdraw_requests' AND policyname='Doctors can create withdraw requests'
  ) THEN
    CREATE POLICY "Doctors can create withdraw requests" ON withdraw_requests FOR INSERT WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
  END IF;
  -- Admins can update withdraw requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='withdraw_requests' AND policyname='Admins can update withdraw requests'
  ) THEN
    CREATE POLICY "Admins can update withdraw requests" ON withdraw_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- user_roles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='Users can view their own roles'
  ) THEN
    CREATE POLICY "Users can view their own roles" ON user_roles FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- consultations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='consultations' AND policyname='Users can view their own consultations'
  ) THEN
    CREATE POLICY "Users can view their own consultations" ON consultations FOR SELECT USING (user_id = auth.uid() OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='consultations' AND policyname='System can insert consultations'
  ) THEN
    CREATE POLICY "System can insert consultations" ON consultations FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- doctor_requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='doctor_requests' AND policyname='Users can create their own doctor request'
  ) THEN
    CREATE POLICY "Users can create their own doctor request" ON doctor_requests FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='doctor_requests' AND policyname='Users can view their own doctor request'
  ) THEN
    CREATE POLICY "Users can view their own doctor request" ON doctor_requests FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='doctor_requests' AND policyname='Admins can update doctor requests'
  ) THEN
    CREATE POLICY "Admins can update doctor requests" ON doctor_requests FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- doctor_reports
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='doctor_reports' AND policyname='Users can create reports'
  ) THEN
    CREATE POLICY "Users can create reports" ON doctor_reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='doctor_reports' AND policyname='Admins/owners can read reports'
  ) THEN
    CREATE POLICY "Admins/owners can read reports" ON doctor_reports FOR SELECT USING (has_role(auth.uid(), 'admin') OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
  END IF;
END $$;

-- RPCs
CREATE OR REPLACE FUNCTION public.generate_op_id(prefix text)
RETURNS text LANGUAGE SQL AS $$
  SELECT prefix || (extract(epoch FROM now())::bigint)::text || lpad((floor(random()*1000))::int::text, 3, '0')
$$;

CREATE OR REPLACE FUNCTION public.perform_consultation(_doctor_id uuid)
RETURNS TABLE(tx_id text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid := auth.uid();
  _fee numeric;
  _doctor_user_id uuid;
  _dept_id uuid;
  _tx text;
  _user_balance numeric;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT COALESCE(d.consultation_fee, d.price), d.user_id, d.department_id INTO _fee, _doctor_user_id, _dept_id FROM public.doctors d WHERE d.id = _doctor_id AND d.is_active = true;
  IF _fee IS NULL THEN RAISE EXCEPTION 'Doctor not found or inactive'; END IF;

  SELECT balance INTO _user_balance FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF _user_balance IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF _user_balance < _fee THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  PERFORM 1 FROM public.wallets WHERE user_id = _doctor_user_id FOR UPDATE;
  UPDATE public.wallets SET balance = balance - _fee WHERE user_id = _user_id;
  UPDATE public.wallets SET balance = balance + _fee WHERE user_id = _doctor_user_id;

  _tx := public.generate_op_id('CS');
  INSERT INTO public.transactions(id, user_id, doctor_id, amount, type, description) VALUES (_tx, _user_id, _doctor_id, _fee, 'consultation', 'استشارة');
  INSERT INTO public.consultations(id, user_id, doctor_id, amount, department_id, status) VALUES (_tx, _user_id, _doctor_id, _fee, _dept_id, 'active');
  RETURN QUERY SELECT _tx;
END; $$;

GRANT EXECUTE ON FUNCTION public.perform_consultation(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.perform_transfer(_receiver_id uuid, _amount numeric)
RETURNS TABLE(tx_id text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _sender_id uuid := auth.uid();
  _tx text;
  _sender_balance numeric;
BEGIN
  IF _sender_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _receiver_id IS NULL OR _receiver_id = _sender_id THEN RAISE EXCEPTION 'Invalid receiver'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;

  SELECT balance INTO _sender_balance FROM public.wallets WHERE user_id = _sender_id FOR UPDATE;
  IF _sender_balance IS NULL THEN RAISE EXCEPTION 'Sender wallet not found'; END IF;
  IF _sender_balance < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  PERFORM 1 FROM public.wallets WHERE user_id = _receiver_id FOR UPDATE;

  UPDATE public.wallets SET balance = balance - _amount WHERE user_id = _sender_id;
  UPDATE public.wallets SET balance = balance + _amount WHERE user_id = _receiver_id;

  _tx := public.generate_op_id('TR');
  INSERT INTO public.transactions(id, user_id, receiver_id, amount, type, description) VALUES (_tx, _sender_id, _receiver_id, _amount, 'transfer', 'تحويل رصيد');
  RETURN QUERY SELECT _tx;
END; $$;

GRANT EXECUTE ON FUNCTION public.perform_transfer(uuid, numeric) TO anon, authenticated;
