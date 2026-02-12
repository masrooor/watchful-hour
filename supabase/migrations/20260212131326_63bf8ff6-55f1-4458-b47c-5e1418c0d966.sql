
-- Add approval workflow columns to employee_loans
ALTER TABLE public.employee_loans 
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by uuid NULL,
ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS reason text NULL;

-- Update existing loans to be 'approved' so they continue working
UPDATE public.employee_loans SET approval_status = 'approved' WHERE approval_status = 'pending';

-- Allow employees to insert their own loan requests
CREATE POLICY "Users can insert own loan requests"
ON public.employee_loans
FOR INSERT
WITH CHECK (auth.uid() = user_id);
