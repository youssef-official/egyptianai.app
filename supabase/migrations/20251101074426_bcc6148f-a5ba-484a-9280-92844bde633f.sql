-- Create doctor_reports table if not exists
CREATE TABLE IF NOT EXISTS public.doctor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctor_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create reports" ON public.doctor_reports;
DROP POLICY IF EXISTS "Admins/owners can read reports" ON public.doctor_reports;

-- Create policies
CREATE POLICY "Users can create reports" 
ON public.doctor_reports 
FOR INSERT 
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins/owners can read reports" 
ON public.doctor_reports 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
);