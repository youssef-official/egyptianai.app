-- ==================================================================================
-- SQL Fix for "Database Error For Saving a new user" for Hospital Registration
-- ==================================================================================

-- 1. Update user_type ENUM to include 'hospital'
-- NOTE: In a live database, you cannot directly alter an ENUM to add a value
-- if the ENUM is already in use. The correct way is to:
-- a) Create a new ENUM type (e.g., user_type_new) with the new value.
-- b) Alter the table column to use the new ENUM type.
-- c) Drop the old ENUM type.
-- d) Rename the new ENUM type to the old name.
-- Since this is a fix for a migration issue, we will provide the direct ALTER TYPE
-- which is what Supabase migrations would handle, or the user can run it manually
-- if the ENUM is not yet used in production.

-- If the ENUM is not yet used in production (e.g., first migration run):
-- ALTER TYPE user_type ADD VALUE 'hospital';

-- If the ENUM is already in use, use the safe migration path:
ALTER TYPE public.user_type ADD VALUE 'hospital' AFTER 'doctor';


-- 2. Update user_roles table CHECK constraint to include 'hospital'
-- This is a DDL change and might require a full table rewrite in some environments.
-- For a quick fix, we'll provide the ALTER TABLE command.
ALTER TABLE public.user_roles
DROP CONSTRAINT user_roles_role_check,
ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'user', 'doctor', 'hospital'));


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
-- END OF FIX
-- ==================================================================================
