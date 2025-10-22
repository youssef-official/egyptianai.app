-- Create deposit proof storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('deposit-proofs', 'deposit-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for deposit proofs
CREATE POLICY "Users can upload their own deposit proofs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'deposit-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own deposit proofs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'deposit-proofs' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin')));

CREATE POLICY "Admins can view all deposit proofs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'deposit-proofs' AND has_role(auth.uid(), 'admin'));

-- Add verification fields to doctors table
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verification_requested_at timestamp with time zone;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_fee numeric;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS doctor_name text;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS address text;

-- Update doctors RLS policies
DROP POLICY IF EXISTS "Anyone can view active doctors" ON doctors;
CREATE POLICY "Anyone can view active doctors"
ON doctors
FOR SELECT
USING (
  (is_active = true) 
  OR (user_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin')
);