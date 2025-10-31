-- Create consultations table to track all consultations
CREATE TABLE IF NOT EXISTS public.consultations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  department_id UUID REFERENCES public.medical_departments(id),
  status TEXT DEFAULT 'active'
);

-- Enable RLS
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own consultations"
ON public.consultations
FOR SELECT
USING (user_id = auth.uid() OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert consultations"
ON public.consultations
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Create doctor_requests table for doctor applications
CREATE TABLE IF NOT EXISTS public.doctor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  specialization TEXT NOT NULL,
  certificate_url TEXT NOT NULL,
  id_card_front_url TEXT NOT NULL,
  id_card_back_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctor_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own doctor request"
ON public.doctor_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own doctor request"
ON public.doctor_requests
FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update doctor requests"
ON public.doctor_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create trigger for doctor_requests updated_at
CREATE TRIGGER update_doctor_requests_updated_at
BEFORE UPDATE ON public.doctor_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for doctor documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('doctor-documents', 'doctor-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for doctor documents
CREATE POLICY "Users can upload their doctor documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'doctor-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own doctor documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'doctor-documents' 
  AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Admins can delete doctor documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'doctor-documents' 
  AND has_role(auth.uid(), 'admin')
);