-- Add rejection_reason column to leave_requests
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add HR update policy for profiles
CREATE POLICY "HR can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

-- Add HR update attendance policy
CREATE POLICY "HR can update attendance"
ON public.attendance_records
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role));

-- Add HR delete attendance
CREATE POLICY "HR can delete attendance"
ON public.attendance_records
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role));