-- Fix handle_new_user trigger to properly store user data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure RLS policies that depend on auth.uid() evaluate to the new user's id
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', NEW.id::text, 'role', 'authenticated')::text,
    true
  );

  -- Create or update profile row with proper data handling
  INSERT INTO public.profiles (id, full_name, phone, user_type, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'مستخدم'),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''), ''),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'user'),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(TRIM(EXCLUDED.full_name), ''), profiles.full_name, 'مستخدم'),
    phone = COALESCE(NULLIF(TRIM(EXCLUDED.phone), ''), profiles.phone),
    user_type = EXCLUDED.user_type,
    email = COALESCE(EXCLUDED.email, profiles.email);

  -- Create wallet row if missing (only for non-hospital users)
  IF COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'user') != 'hospital' THEN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (NEW.id, 0.00)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;