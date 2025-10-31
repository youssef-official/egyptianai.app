-- Fix RLS policies for doctors table to allow inserts
DROP POLICY IF EXISTS "Doctors can create their profile" ON public.doctors;

CREATE POLICY "Doctors can create their profile"
ON public.doctors
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Update withdraw_requests to ensure doctor_id is properly set
DROP POLICY IF EXISTS "Doctors can create withdraw requests" ON public.withdraw_requests;

CREATE POLICY "Doctors can create withdraw requests"
ON public.withdraw_requests
FOR INSERT
WITH CHECK (
  doctor_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  )
);