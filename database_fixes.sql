-- ==================================================================================
-- This file contains SQL fixes for two critical issues:
-- 1. Admins being unable to view hospital ownership documents due to RLS policies.
-- 2. Hospital accounts not being created properly after an admin approves a request.
-- ==================================================================================

-- ==================================================================================
-- FIX 1: RLS Policy for Admins to Read Hospital Documents
-- Creates a policy that allows users with the 'admin' role to view all documents
-- in the 'hospital-documents' bucket, which is necessary for the review process.
-- ==================================================================================
CREATE POLICY "Admins can view all hospital documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'hospital-documents' AND
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
);


-- ==================================================================================
-- FIX 2: Corrected Stored Procedure for Hospital Request Approval
-- Drops the old (and potentially faulty) function and creates a new, robust one.
-- This new function ensures that when a request is approved:
-- 1. The request status is updated to 'approved'.
-- 2. A new record is inserted into the public.hospitals table using the request data.
-- 3. The hospital's user_id is correctly linked.
-- ==================================================================================

-- Drop the existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS public.approve_hospital_request;

-- Create the new function
CREATE OR REPLACE FUNCTION public.approve_hospital_request(
  _request_id bigint,
  _approve boolean,
  _notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_data hospital_requests;
BEGIN
  -- Update the status of the hospital request
  UPDATE public.hospital_requests
  SET
    status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
    admin_notes = _notes,
    updated_at = now()
  WHERE id = _request_id
  RETURNING * INTO request_data;

  -- If the request is approved, create a new entry in the hospitals table
  IF _approve THEN
    INSERT INTO public.hospitals (user_id, name, phone, email, logo_url, is_approved)
    VALUES (
      request_data.user_id,
      request_data.hospital_name,
      request_data.phone,
      request_data.email,
      request_data.logo_url,
      true
    );
  END IF;
END;
$$;

-- ==================================================================================
-- END OF SQL FIXES
-- **IMPORTANT**: Apply this SQL script to your Supabase database.
-- ==================================================================================
