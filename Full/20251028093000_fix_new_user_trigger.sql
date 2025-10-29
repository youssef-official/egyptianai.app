-- Fix handle_new_user to satisfy RLS and be idempotent
-- - Set request.jwt.claims so auth.uid() = NEW.id inside function
-- - Insert email
-- - Use ON CONFLICT to avoid duplicate errors

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

  -- Create or update profile row
  INSERT INTO public.profiles (id, full_name, phone, user_type, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'user'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    user_type = EXCLUDED.user_type,
    email = EXCLUDED.email;

  -- Create wallet row if missing
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;