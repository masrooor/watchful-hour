
-- Attendance settings table (single row config)
CREATE TABLE public.attendance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_start_time time NOT NULL DEFAULT '10:00:00',
  office_end_time time NOT NULL DEFAULT '19:00:00',
  grace_period_minutes integer NOT NULL DEFAULT 30,
  allowed_latitude double precision,
  allowed_longitude double precision,
  allowed_radius_meters integer DEFAULT 500,
  location_name text DEFAULT 'Office',
  location_restriction_enabled boolean NOT NULL DEFAULT false,
  notify_admin_on_late boolean NOT NULL DEFAULT true,
  notify_admin_on_absence boolean NOT NULL DEFAULT true,
  notify_employee_on_late boolean NOT NULL DEFAULT true,
  notify_employee_on_clockout boolean NOT NULL DEFAULT true,
  admin_notification_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.attendance_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage settings" ON public.attendance_settings FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Anyone authenticated can read settings" ON public.attendance_settings FOR SELECT USING (true);

-- Insert default row
INSERT INTO public.attendance_settings (id) VALUES (gen_random_uuid());

-- Trigger for updated_at
CREATE TRIGGER update_attendance_settings_updated_at
  BEFORE UPDATE ON public.attendance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
