
-- Manager RLS policies: full read + approve leaves/loans
CREATE POLICY "Managers can read all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can read all attendance"
ON public.attendance_records FOR SELECT
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can read all leaves"
ON public.leave_requests FOR SELECT
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update leaves"
ON public.leave_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can read all balances"
ON public.leave_balances FOR SELECT
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can read all loans"
ON public.employee_loans FOR SELECT
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can manage loans"
ON public.employee_loans FOR UPDATE
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can read all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

-- Payroll Officer RLS policies: payroll-related tables only
CREATE POLICY "Payroll officers can read all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'payroll_officer'::app_role));

CREATE POLICY "Payroll officers can manage allowances"
ON public.employee_allowances FOR ALL
USING (public.has_role(auth.uid(), 'payroll_officer'::app_role));

CREATE POLICY "Payroll officers can manage deductions"
ON public.employee_deductions FOR ALL
USING (public.has_role(auth.uid(), 'payroll_officer'::app_role));

CREATE POLICY "Payroll officers can read all loans"
ON public.employee_loans FOR SELECT
USING (public.has_role(auth.uid(), 'payroll_officer'::app_role));

CREATE POLICY "Payroll officers can read all attendance"
ON public.attendance_records FOR SELECT
USING (public.has_role(auth.uid(), 'payroll_officer'::app_role));

CREATE POLICY "Payroll officers can read all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'payroll_officer'::app_role));

CREATE POLICY "Payroll officers can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'payroll_officer'::app_role));
