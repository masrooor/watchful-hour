import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { loanId, action, approverName } = await req.json();

    if (!loanId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: loanId, action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: loan, error: loanErr } = await supabase
      .from('employee_loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanErr || !loan) throw new Error('Loan not found');

    const { data: empProfile } = await supabase
      .from('profiles')
      .select('name, email, department')
      .eq('user_id', loan.user_id)
      .single();

    const employeeName = empProfile?.name || 'Employee';
    const employeeEmail = empProfile?.email || 'unknown';
    const department = empProfile?.department || 'Unknown';
    const actionLabel = action === 'approved' ? 'Approved' : 'Rejected';

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `You are an HR notification system. Generate a professional loan ${action} email body (3-4 sentences). Include: employee name, loan description, total amount, monthly deduction, and who approved/rejected it. Be professional and concise. Do not include subject line or greetings - just the body content.`
          },
          {
            role: 'user',
            content: `Loan request ${actionLabel}: ${employeeName} (${department}) requested a loan "${loan.description}" for Rs ${loan.total_amount} with monthly deduction of Rs ${loan.monthly_deduction}. Reason: ${loan.reason || 'Not specified'}. ${actionLabel} by ${approverName || 'Admin'}.`
          }
        ],
        max_tokens: 300,
      }),
    });

    let emailBody: string;
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      emailBody = aiData.choices?.[0]?.message?.content ||
        `Your loan request "${loan.description}" for Rs ${loan.total_amount} with monthly deduction of Rs ${loan.monthly_deduction} has been ${actionLabel.toLowerCase()} by ${approverName || 'Admin'}.`;
    } else {
      emailBody = `Your loan request "${loan.description}" for Rs ${loan.total_amount} with monthly deduction of Rs ${loan.monthly_deduction} has been ${actionLabel.toLowerCase()} by ${approverName || 'Admin'}.`;
    }

    const subject = `Loan ${actionLabel} - ${employeeName} (Rs ${loan.total_amount})`;

    console.log(`[LOAN ${actionLabel.toUpperCase()}] To: ${employeeEmail}`);
    console.log(`[LOAN ${actionLabel.toUpperCase()}] Subject: ${subject}`);
    console.log(`[LOAN ${actionLabel.toUpperCase()}] Body: ${emailBody}`);

    return new Response(
      JSON.stringify({
        success: true,
        notification: {
          employee: { email: employeeEmail, name: employeeName },
          subject,
          body: emailBody,
          action: actionLabel,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-loan-action:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
