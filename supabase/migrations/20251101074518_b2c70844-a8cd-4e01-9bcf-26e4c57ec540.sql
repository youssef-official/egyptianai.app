-- Add email column to profiles table if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create perform_consultation RPC function
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

-- Create perform_transfer RPC function
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.perform_consultation(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.perform_transfer(uuid, numeric) TO anon, authenticated;