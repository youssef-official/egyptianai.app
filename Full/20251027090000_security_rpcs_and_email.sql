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

CREATE POLICY IF NOT EXISTS "Users/admins can update wallet"
ON public.wallets
FOR UPDATE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

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
CREATE POLICY IF NOT EXISTS "Admins can update doctors"
ON public.doctors
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

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
CREATE POLICY IF NOT EXISTS "Users can create reports"
ON public.doctor_reports FOR INSERT
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Admins/owners can read reports"
ON public.doctor_reports FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
);
