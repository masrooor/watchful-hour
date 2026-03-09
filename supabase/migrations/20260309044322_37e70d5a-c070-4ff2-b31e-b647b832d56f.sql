
-- Create payroll_payments table
CREATE TABLE public.payroll_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  is_paid boolean NOT NULL DEFAULT false,
  paid_by uuid,
  paid_at timestamp with time zone,
  screenshot_path text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, month, year)
);

ALTER TABLE public.payroll_payments ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage payroll_payments" ON public.payroll_payments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- HR full access
CREATE POLICY "HR can manage payroll_payments" ON public.payroll_payments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'hr'));

-- Payroll officers full access
CREATE POLICY "Payroll officers can manage payroll_payments" ON public.payroll_payments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'payroll_officer'));

-- Users can read own
CREATE POLICY "Users can read own payroll_payments" ON public.payroll_payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', false);

-- Storage policies
CREATE POLICY "Admin/HR/Payroll can upload screenshots" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-screenshots' AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'payroll_officer'))
  );

CREATE POLICY "Admin/HR/Payroll can read screenshots" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-screenshots' AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'payroll_officer'))
  );

CREATE POLICY "Users can read own payment screenshots" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-screenshots' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admin/HR/Payroll can delete screenshots" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'payment-screenshots' AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'payroll_officer'))
  );
