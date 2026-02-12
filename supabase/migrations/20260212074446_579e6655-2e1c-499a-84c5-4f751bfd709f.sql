
-- Allow admins to delete attendance records
CREATE POLICY "Admins can delete attendance"
ON public.attendance_records
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update attendance records
CREATE POLICY "Admins can update attendance"
ON public.attendance_records
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
