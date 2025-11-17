-- ==================================================================================
-- SQL Fix for RLS Violation on Storage Upload (new row violates row-level security policy)
-- This fix addresses the RLS issue on the 'hospital-documents' storage bucket
-- which is likely failing because the user is not fully authenticated after sign-up.
-- ==================================================================================

-- 1. Drop the restrictive RLS policy for INSERT on the storage bucket
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;

-- 2. Create a new, less restrictive policy for INSERT
-- This policy allows any authenticated user to upload to the 'hospital-documents' bucket.
-- The client-side code will still use the user's ID in the file name for organization.
CREATE POLICY "Authenticated users can upload to hospital-documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hospital-documents' AND auth.role() = 'authenticated');

-- ==================================================================================
-- END OF SQL FIX
-- **IMPORTANT**: Run this file on your database.
-- ==================================================================================
