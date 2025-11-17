-- ==================================================================================
-- SQL Fix for "Database Error For Saving a new user" - STEP 2 of 2
-- This step updates the function and RLS policy, which depend on the new ENUM value.
-- ==================================================================================

-- 3. Update the handle_new_user function to insert the 'hospital' role
-- This function is triggered AFTER INSERT on auth.users.
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
  
  -- Insert user role if user_type is hospital
  IF COALESCE((NEW.raw_user_meta_data->>'user_type')::text, 'user') = 'hospital' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'hospital');
  END IF;
  
  RETURN NEW;
END;
$function$;


-- 4. Update the RLS policy for hospital_requests to ensure user_type is 'hospital'
-- This prevents non-hospital users from creating hospital requests.
DROP POLICY IF EXISTS "Users can create requests" ON public.hospital_requests;

CREATE POLICY "Hospitals can create requests"
  ON public.hospital_requests FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (SELECT user_type FROM public.profiles WHERE id = auth.uid()) = 'hospital'
  );

-- ==================================================================================
-- END OF STEP 2
-- **IMPORTANT**: Run this file only after STEP 1 has been successfully executed.
-- ==================================================================================
