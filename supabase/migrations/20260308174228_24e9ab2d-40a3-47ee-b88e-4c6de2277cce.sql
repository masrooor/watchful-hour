
-- 1. PROFILES: Restrict employee self-update to only safe fields (prevent salary/job_status/employment_type tampering)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own contact info"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a trigger to prevent employees from updating sensitive fields
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If the user is NOT admin/hr, prevent changes to sensitive fields
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr')) THEN
    NEW.salary := OLD.salary;
    NEW.job_status := OLD.job_status;
    NEW.employment_type := OLD.employment_type;
    NEW.department := OLD.department;
    NEW.designation := OLD.designation;
    NEW.joining_date := OLD.joining_date;
    NEW.employee_id := OLD.employee_id;
    NEW.shift_start := OLD.shift_start;
    NEW.shift_end := OLD.shift_end;
    NEW.required_daily_hours := OLD.required_daily_hours;
    NEW.email := OLD.email;
    NEW.cnic := OLD.cnic;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_sensitive_profile_fields_trigger ON public.profiles;
CREATE TRIGGER protect_sensitive_profile_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- 2. ATTENDANCE_SETTINGS: Replace open read policy with authenticated-only
DROP POLICY IF EXISTS "Anyone authenticated can read settings" ON public.attendance_settings;

CREATE POLICY "Authenticated users can read settings"
ON public.attendance_settings
FOR SELECT
TO authenticated
USING (true);

-- 3. TAX_SLABS: Replace open read policy with authenticated-only
DROP POLICY IF EXISTS "Anyone authenticated can read tax slabs" ON public.tax_slabs;

CREATE POLICY "Authenticated users can read tax slabs"
ON public.tax_slabs
FOR SELECT
TO authenticated
USING (true);

-- 4. HOLIDAYS: Replace open read policy with authenticated-only
DROP POLICY IF EXISTS "Anyone authenticated can read holidays" ON public.holidays;

CREATE POLICY "Authenticated users can read holidays"
ON public.holidays
FOR SELECT
TO authenticated
USING (true);

-- 5. ANNOUNCEMENTS: Replace open read policy with authenticated-only
DROP POLICY IF EXISTS "Anyone authenticated can read announcements" ON public.announcements;

CREATE POLICY "Authenticated users can read announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (true);

-- 6. NOTIFICATIONS: Fix spoofing - replace self-insert policy with admin/hr/system only
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
