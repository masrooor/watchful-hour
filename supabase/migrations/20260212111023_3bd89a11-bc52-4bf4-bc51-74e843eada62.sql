
-- Add work_days to attendance_settings (array of day numbers: 0=Sun, 1=Mon, ..., 6=Sat)
ALTER TABLE public.attendance_settings
ADD COLUMN work_days integer[] NOT NULL DEFAULT '{1,2,3,4,5,6}';

-- Create holidays table
CREATE TABLE public.holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read holidays"
  ON public.holidays FOR SELECT USING (true);

CREATE POLICY "Admins can manage holidays"
  ON public.holidays FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "HR can manage holidays"
  ON public.holidays FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
