-- ==================================================================================
-- SQL Fix for RLS Violation (new row violates row-level security policy)
-- This fix addresses the potential RLS issue on user_roles and re-applies the
-- simplified RLS for hospital_requests.
-- ==================================================================================

-- 1. Grant INSERT permission on user_roles to the authenticated role
-- This is a safeguard in case the SECURITY DEFINER function is somehow
-- being blocked by RLS on the user_roles table.
GRANT INSERT ON public.user_roles TO authenticated;

-- 2. Re-apply the simplified RLS policy for hospital_requests
-- This ensures the user can insert their request immediately after sign-up.
DROP POLICY IF EXISTS "Users can create their own hospital request" ON public.hospital_requests;
DROP POLICY IF EXISTS "Hospitals can create requests" ON public.hospital_requests;

CREATE POLICY "Users can create their own hospital request"
  ON public.hospital_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Grant INSERT permission on hospital_requests to the authenticated role
-- This is another safeguard to ensure the client can insert the row.
GRANT INSERT ON public.hospital_requests TO authenticated;

-- ==================================================================================
-- END OF FIX
-- **IMPORTANT**: Run this file on your database.
-- ==================================================================================
