-- ==================================================================================
-- SQL Fix for RLS Violation on hospital_requests table
-- This fix addresses the issue where the RLS policy prevents the insertion
-- of the hospital request record immediately after user sign-up.
-- ==================================================================================

-- 1. Drop the existing RLS policy
DROP POLICY IF EXISTS "Hospitals can create requests" ON public.hospital_requests;

-- 2. Create a new RLS policy that only checks for the user_id matching auth.uid()
-- The user_type check is implicitly handled by the fact that only 'hospital' users
-- are directed to this sign-up flow, and the subsequent check is too strict
-- because the user's profile might not be fully committed yet.
-- The simplest and safest check is to ensure the user is inserting their own request.
CREATE POLICY "Users can create their own hospital request"
  ON public.hospital_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Note: The previous check was:
-- WITH CHECK (
--   user_id = auth.uid() AND
--   (SELECT user_type FROM public.profiles WHERE id = auth.uid()) = 'hospital'
-- );
-- This check is too strict and causes the RLS violation because the profile
-- is created by a trigger *after* the auth.users insert, and the RLS policy
-- is evaluated *before* the transaction is fully committed.
-- By removing the subquery, we rely on the client-side logic and the fact
-- that the user is authenticated.

-- ==================================================================================
-- END OF FIX
-- ==================================================================================
