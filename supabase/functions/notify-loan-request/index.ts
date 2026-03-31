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

    const { loanId, employeeName, description, totalAmount, monthlyDeduction, reason } = await req.json();

    if (!loanId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: loanId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all admin and HR user IDs for in-app notifications
    const { data: adminHrRoles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['admin', 'hr']);

    const adminHrUserIds = [...new Set((adminHrRoles || []).map((r: any) => r.user_id))];

    const notificationMessage = `${employeeName || 'An employee'} has requested a loan "${description}" for Rs ${totalAmount} with monthly deduction of Rs ${monthlyDeduction}. Reason: ${reason || 'Not specified'}.`;

    // Insert in-app notifications for all admin/HR users
    if (adminHrUserIds.length > 0) {
      const notifications = adminHrUserIds.map((uid: string) => ({
        user_id: uid,
        title: `New Loan Request - ${employeeName || 'Employee'}`,
        message: notificationMessage,
        type: 'loan',
      }));
      await supabase.from('notifications').insert(notifications);
    }

    // Get admin profiles for email logging
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .in('user_id', adminHrUserIds);

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
            content: 'You are an HR notification system. Generate a professional email body (3-4 sentences) notifying an admin about a new loan request from an employee. Include: employee name, loan description, total amount, monthly deduction, and reason. Be professional and concise. Do not include subject line or greetings - just the body content.'
          },
          {
            role: 'user',
            content: `New loan request submitted: ${employeeName} has requested a loan "${description}" for Rs ${totalAmount} with monthly deduction of Rs ${monthlyDeduction}. Reason: ${reason || 'Not specified'}. This requires admin review and approval.`
          }
        ],
        max_tokens: 300,
      }),
    });

    let emailBody: string;
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      emailBody = aiData.choices?.[0]?.message?.content ||
        `${employeeName} has submitted a new loan request "${description}" for Rs ${totalAmount} with monthly deduction of Rs ${monthlyDeduction}. Please review and take action.`;
    } else {
      emailBody = `${employeeName} has submitted a new loan request "${description}" for Rs ${totalAmount} with monthly deduction of Rs ${monthlyDeduction}. Please review and take action.`;
    }

    const subject = `New Loan Request - ${employeeName} (Rs ${totalAmount})`;

    for (const profile of (adminProfiles || [])) {
      console.log(`[NEW LOAN REQUEST] To: ${profile.email} (${profile.name})`);
      console.log(`[NEW LOAN REQUEST] Subject: ${subject}`);
      console.log(`[NEW LOAN REQUEST] Body: ${emailBody}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notified: adminHrUserIds.length,
        notification: {
          subject,
          body: emailBody,
          employee: employeeName,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-loan-request:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
