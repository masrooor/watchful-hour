-- =====================================================
-- FULL DATABASE SCHEMA FOR HR/ATTENDANCE MANAGEMENT APP
-- =====================================================
-- Run this file against a fresh Supabase project to recreate the entire schema.
-- Order matters: types → functions → tables → triggers → policies → realtime → seed data

-- =====================================================
-- 1. EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =====================================================
-- 2. CUSTOM ENUM TYPES
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'hr', 'manager', 'payroll_officer');

-- =====================================================
-- 3. UTILITY FUNCTIONS
-- =====================================================

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =====================================================
-- 4. TABLES
-- =====================================================

-- 4.1 User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4.2 Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  email TEXT,
  employee_id TEXT UNIQUE,
  cnic TEXT,
  phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  address TEXT,
  city TEXT,
  date_of_birth DATE,
  designation TEXT,
  employment_type TEXT DEFAULT 'full-time',
  salary NUMERIC,
  joining_date DATE,
  job_status TEXT NOT NULL DEFAULT 'probation',
  shift_start TIME,
  shift_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Employee ID sequence and auto-assign
CREATE SEQUENCE public.employee_id_seq START 1;

CREATE OR REPLACE FUNCTION public.assign_employee_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.employee_id IS NULL THEN
    NEW.employee_id := 'EMP-' || LPAD(nextval('public.employee_id_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_employee_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_employee_id();

-- 4.3 Attendance Records (no unique constraint on user_id+date — allows multiple sessions per day)
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 4.4 Attendance Settings (single-row config)
CREATE TABLE public.attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_start_time TIME NOT NULL DEFAULT '10:00:00',
  office_end_time TIME NOT NULL DEFAULT '19:00:00',
  grace_period_minutes INTEGER NOT NULL DEFAULT 30,
  allowed_latitude DOUBLE PRECISION,
  allowed_longitude DOUBLE PRECISION,
  allowed_radius_meters INTEGER DEFAULT 500,
  location_name TEXT DEFAULT 'Office',
  location_restriction_enabled BOOLEAN NOT NULL DEFAULT false,
  notify_admin_on_late BOOLEAN NOT NULL DEFAULT true,
  notify_admin_on_absence BOOLEAN NOT NULL DEFAULT true,
  notify_employee_on_late BOOLEAN NOT NULL DEFAULT true,
  notify_employee_on_clockout BOOLEAN NOT NULL DEFAULT true,
  admin_notification_email TEXT,
  work_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  probation_period_days INTEGER NOT NULL DEFAULT 90,
  required_daily_hours NUMERIC NOT NULL DEFAULT 9,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

-- 4.5 Leave Requests
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'casual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- 4.6 Leave Balances
CREATE TABLE public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  casual_total INTEGER NOT NULL DEFAULT 10,
  casual_used INTEGER NOT NULL DEFAULT 0,
  sick_total INTEGER NOT NULL DEFAULT 8,
  sick_used INTEGER NOT NULL DEFAULT 0,
  annual_total INTEGER NOT NULL DEFAULT 14,
  annual_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- 4.7 Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 4.8 Holidays
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- 4.9 Employee Loans
CREATE TABLE public.employee_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  monthly_deduction NUMERIC NOT NULL DEFAULT 0,
  total_deducted NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_loans ENABLE ROW LEVEL SECURITY;

-- 4.10 Tax Slabs
CREATE TABLE public.tax_slabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_salary NUMERIC NOT NULL DEFAULT 0,
  max_salary NUMERIC, -- NULL means no upper limit
  percentage NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tax_slabs ENABLE ROW LEVEL SECURITY;

-- 4.11 Employee Allowances
CREATE TABLE public.employee_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  allowance_type TEXT NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_allowances ENABLE ROW LEVEL SECURITY;

-- 4.12 Employee Deductions
CREATE TABLE public.employee_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  deduction_type TEXT NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  is_percentage BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;

-- 4.13 Audit Logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs (actor_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type);

-- 4.14 Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;

-- =====================================================
-- 5. BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Ensure leave balance record exists
CREATE OR REPLACE FUNCTION public.ensure_leave_balance(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.leave_balances (user_id, year)
  VALUES (_user_id, EXTRACT(YEAR FROM now())::integer)
  ON CONFLICT (user_id, year) DO NOTHING;
END;
$$;

-- Update leave balance when leave is approved/unapproved
CREATE OR REPLACE FUNCTION public.update_leave_balance_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _days integer;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    _days := (NEW.end_date - NEW.start_date) + 1;
    PERFORM public.ensure_leave_balance(NEW.user_id);
    IF NEW.leave_type IN ('casual', 'sick', 'annual') THEN
      EXECUTE format(
        'UPDATE public.leave_balances SET %I = %I + $1 WHERE user_id = $2 AND year = EXTRACT(YEAR FROM now())::integer',
        NEW.leave_type || '_used', NEW.leave_type || '_used'
      ) USING _days, NEW.user_id;
    END IF;
  END IF;
  
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    _days := (NEW.end_date - NEW.start_date) + 1;
    IF NEW.leave_type IN ('casual', 'sick', 'annual') THEN
      EXECUTE format(
        'UPDATE public.leave_balances SET %I = GREATEST(%I - $1, 0) WHERE user_id = $2 AND year = EXTRACT(YEAR FROM now())::integer',
        NEW.leave_type || '_used', NEW.leave_type || '_used'
      ) USING _days, NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_settings_updated_at
  BEFORE UPDATE ON public.attendance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_loans_updated_at
  BEFORE UPDATE ON public.employee_loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_slabs_updated_at
  BEFORE UPDATE ON public.tax_slabs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_allowances_updated_at
  BEFORE UPDATE ON public.employee_allowances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_deductions_updated_at
  BEFORE UPDATE ON public.employee_deductions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_update_leave_balance
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_leave_balance_on_approval();

-- =====================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- --- user_roles ---
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can read all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Managers can read all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Payroll officers can read all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'payroll_officer'::app_role));

-- --- profiles ---
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "HR can read all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Managers can read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Payroll officers can read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'payroll_officer'::app_role));

-- --- attendance_records ---
CREATE POLICY "Users can read own attendance" ON public.attendance_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all attendance" ON public.attendance_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own attendance" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attendance" ON public.attendance_records FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete attendance" ON public.attendance_records FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update attendance" ON public.attendance_records FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can read all attendance" ON public.attendance_records FOR SELECT USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Managers can read all attendance" ON public.attendance_records FOR SELECT USING (public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Payroll officers can read all attendance" ON public.attendance_records FOR SELECT USING (public.has_role(auth.uid(), 'payroll_officer'::app_role));

-- --- attendance_settings ---
CREATE POLICY "Admins can manage settings" ON public.attendance_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage settings" ON public.attendance_settings FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Anyone authenticated can read settings" ON public.attendance_settings FOR SELECT USING (true);

-- --- leave_requests ---
CREATE POLICY "Users can read own leaves" ON public.leave_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leaves" ON public.leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all leaves" ON public.leave_requests FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can read all leaves" ON public.leave_requests FOR SELECT USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Admins can update leaves" ON public.leave_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can update leaves" ON public.leave_requests FOR UPDATE USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Managers can read all leaves" ON public.leave_requests FOR SELECT USING (public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Managers can update leaves" ON public.leave_requests FOR UPDATE USING (public.has_role(auth.uid(), 'manager'::app_role));

-- --- leave_balances ---
CREATE POLICY "Users can read own balances" ON public.leave_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all balances" ON public.leave_balances FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can read all balances" ON public.leave_balances FOR SELECT USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Admins can manage balances" ON public.leave_balances FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage balances" ON public.leave_balances FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "System can insert balances" ON public.leave_balances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Managers can read all balances" ON public.leave_balances FOR SELECT USING (public.has_role(auth.uid(), 'manager'::app_role));

-- --- announcements ---
CREATE POLICY "Anyone authenticated can read announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage announcements" ON public.announcements FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));

-- --- holidays ---
CREATE POLICY "Anyone authenticated can read holidays" ON public.holidays FOR SELECT USING (true);
CREATE POLICY "Admins can manage holidays" ON public.holidays FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage holidays" ON public.holidays FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));

-- --- employee_loans ---
CREATE POLICY "Admins can manage loans" ON public.employee_loans FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage loans" ON public.employee_loans FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Users can read own loans" ON public.employee_loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own loan requests" ON public.employee_loans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Managers can read all loans" ON public.employee_loans FOR SELECT USING (public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Managers can manage loans" ON public.employee_loans FOR UPDATE USING (public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Payroll officers can read all loans" ON public.employee_loans FOR SELECT USING (public.has_role(auth.uid(), 'payroll_officer'::app_role));

-- --- tax_slabs ---
CREATE POLICY "Admins can manage tax slabs" ON public.tax_slabs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage tax slabs" ON public.tax_slabs FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Anyone authenticated can read tax slabs" ON public.tax_slabs FOR SELECT USING (true);

-- --- employee_allowances ---
CREATE POLICY "Admins can manage allowances" ON public.employee_allowances FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage allowances" ON public.employee_allowances FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Users can read own allowances" ON public.employee_allowances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Payroll officers can manage allowances" ON public.employee_allowances FOR ALL USING (public.has_role(auth.uid(), 'payroll_officer'::app_role));

-- --- employee_deductions ---
CREATE POLICY "Admins can manage deductions" ON public.employee_deductions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage deductions" ON public.employee_deductions FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Users can read own deductions" ON public.employee_deductions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Payroll officers can manage deductions" ON public.employee_deductions FOR ALL USING (public.has_role(auth.uid(), 'payroll_officer'::app_role));

-- --- audit_logs ---
CREATE POLICY "Admins can read audit logs" ON public.audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Managers can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Payroll officers can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'payroll_officer'::app_role));

-- --- notifications ---
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can insert notifications" ON public.notifications FOR INSERT WITH CHECK (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Service role can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 8. STORAGE
-- =====================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-documents', 'employee-documents', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can manage all documents" ON storage.objects FOR ALL USING (bucket_id = 'employee-documents' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage all documents" ON storage.objects FOR ALL USING (bucket_id = 'employee-documents' AND has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT USING (bucket_id = 'employee-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload own documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'employee-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- 9. REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =====================================================
-- 10. SEED DATA
-- =====================================================

-- Default attendance settings row
INSERT INTO public.attendance_settings (id) VALUES (gen_random_uuid());

-- Default Pakistani tax slabs
INSERT INTO public.tax_slabs (min_salary, max_salary, percentage, description) VALUES
(0, 50000, 0, 'No tax'),
(50001, 100000, 2.5, 'Basic slab'),
(100001, 200000, 12.5, 'Middle slab'),
(200001, NULL, 22.5, 'Higher slab');
