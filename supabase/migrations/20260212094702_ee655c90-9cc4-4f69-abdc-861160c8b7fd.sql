
-- Extend profiles with HR fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cnic text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'full-time',
  ADD COLUMN IF NOT EXISTS salary numeric,
  ADD COLUMN IF NOT EXISTS joining_date date;

-- Leave requests
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  leave_type text NOT NULL DEFAULT 'casual',
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own leaves" ON public.leave_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leaves" ON public.leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all leaves" ON public.leave_requests FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can read all leaves" ON public.leave_requests FOR SELECT USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Admins can update leaves" ON public.leave_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can update leaves" ON public.leave_requests FOR UPDATE USING (has_role(auth.uid(), 'hr'::app_role));

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage announcements" ON public.announcements FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents storage
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-documents', 'employee-documents', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can manage all documents" ON storage.objects FOR ALL USING (bucket_id = 'employee-documents' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage all documents" ON storage.objects FOR ALL USING (bucket_id = 'employee-documents' AND has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT USING (bucket_id = 'employee-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload own documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'employee-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- HR RLS on existing tables
CREATE POLICY "HR can read all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "HR can read all attendance" ON public.attendance_records FOR SELECT USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "HR can read all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'hr'::app_role));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
