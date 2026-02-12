import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface PayslipData {
  name: string;
  employee_id: string | null;
  department: string;
  designation: string | null;
  email: string | null;
  salary: number;
  perDaySalary: number;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
  lateDays: number;
  absentDeduction: number;
  loanDeduction: number;
  taxPercentage: number;
  taxDeduction: number;
  deduction: number;
  netSalary: number;
}

interface PayslipGeneratorProps {
  employee: PayslipData;
  month: string;
  year: number;
  totalWorkingDays: number;
  companyName?: string;
}

const PayslipGenerator = ({
  employee,
  month,
  year,
  totalWorkingDays,
  companyName = "Company",
}: PayslipGeneratorProps) => {
  const generatePayslip = () => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Payslip - ${employee.name} - ${month} ${year}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; }
    .payslip { max-width: 700px; margin: 0 auto; border: 2px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; padding: 28px 32px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 22px; font-weight: 700; }
    .header .period { font-size: 13px; opacity: 0.85; margin-top: 4px; }
    .header .badge { background: rgba(255,255,255,0.15); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .employee-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 24px 32px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0; }
    .info-item label { font-size: 11px; text-transform: uppercase; color: #888; font-weight: 600; letter-spacing: 0.5px; }
    .info-item p { font-size: 14px; font-weight: 500; margin-top: 2px; }
    .section { padding: 24px 32px; }
    .section-title { font-size: 13px; text-transform: uppercase; font-weight: 700; color: #888; letter-spacing: 0.5px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    table th, table td { padding: 10px 0; font-size: 13px; text-align: left; }
    table th { color: #888; font-weight: 600; border-bottom: 2px solid #e0e0e0; }
    table td { border-bottom: 1px solid #f0f0f0; }
    table td:last-child, table th:last-child { text-align: right; }
    .total-row td { border-top: 2px solid #1a1a2e; border-bottom: none; font-weight: 700; font-size: 15px; padding-top: 14px; }
    .net-box { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; margin: 0 32px 24px; padding: 20px 24px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
    .net-box .label { font-size: 14px; font-weight: 500; opacity: 0.9; }
    .net-box .amount { font-size: 26px; font-weight: 700; }
    .footer { text-align: center; padding: 16px; font-size: 11px; color: #aaa; border-top: 1px solid #e0e0e0; }
    @media print {
      body { padding: 0; }
      .payslip { border: none; }
    }
  </style>
</head>
<body>
  <div class="payslip">
    <div class="header">
      <div>
        <h1>${companyName}</h1>
        <p class="period">Payslip for ${month} ${year}</p>
      </div>
      <div class="badge">PAYSLIP</div>
    </div>
    <div class="employee-info">
      <div class="info-item"><label>Employee Name</label><p>${employee.name}</p></div>
      <div class="info-item"><label>Employee ID</label><p>${employee.employee_id || "—"}</p></div>
      <div class="info-item"><label>Department</label><p>${employee.department || "—"}</p></div>
      <div class="info-item"><label>Designation</label><p>${employee.designation || "—"}</p></div>
    </div>
    <div class="section">
      <p class="section-title">Attendance Summary</p>
      <table>
        <tr><th>Description</th><th>Days</th></tr>
        <tr><td>Total Working Days</td><td>${totalWorkingDays}</td></tr>
        <tr><td>Days Present</td><td>${employee.presentDays}</td></tr>
        <tr><td>Approved Leaves (Paid)</td><td>${employee.leaveDays}</td></tr>
        <tr><td>Late Arrivals</td><td>${employee.lateDays}</td></tr>
        <tr><td>Absent Days (Unpaid)</td><td>${employee.absentDays}</td></tr>
      </table>
    </div>
    <div class="section" style="padding-top: 0;">
      <p class="section-title">Earnings & Deductions</p>
      <table>
        <tr><th>Description</th><th>Amount (Rs)</th></tr>
        <tr><td>Gross Salary</td><td>${employee.salary.toLocaleString()}</td></tr>
        <tr><td>Per Day Rate</td><td>${employee.perDaySalary.toFixed(0)}</td></tr>
        <tr><td style="color:#c0392b;">Absent Deduction (${employee.absentDays} days × Rs ${employee.perDaySalary.toFixed(0)})</td><td style="color:#c0392b;">- ${employee.absentDeduction.toFixed(0)}</td></tr>
        <tr><td style="color:#c0392b;">Loan Deduction</td><td style="color:#c0392b;">${employee.loanDeduction > 0 ? '- ' + employee.loanDeduction.toFixed(0) : '0'}</td></tr>
        <tr><td style="color:#c0392b;">Income Tax (${employee.taxPercentage}%)</td><td style="color:#c0392b;">${employee.taxDeduction > 0 ? '- ' + employee.taxDeduction.toFixed(0) : '0'}</td></tr>
        <tr class="total-row"><td>Net Payable</td><td>Rs ${employee.netSalary.toFixed(0).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",")}</td></tr>
      </table>
    </div>
    <div class="net-box">
      <span class="label">Net Salary Payable</span>
      <span class="amount">Rs ${employee.netSalary.toFixed(0).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",")}</span>
    </div>
    <div class="footer">
      This is a system-generated payslip. Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
    </div>
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={generatePayslip} title="Download Payslip">
      <FileText className="w-4 h-4" />
    </Button>
  );
};

export default PayslipGenerator;
