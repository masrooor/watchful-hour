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

    const { leaveId, action, approverName } = await req.json();

    if (!leaveId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: leaveId, action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch leave request details
    const { data: leave, error: leaveErr } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', leaveId)
      .single();

    if (leaveErr || !leave) {
      throw new Error('Leave request not found');
    }

    // Fetch employee profile
    const { data: empProfile } = await supabase
      .from('profiles')
      .select('name, email, department')
      .eq('user_id', leave.user_id)
      .single();

    const employeeName = empProfile?.name || 'Employee';
    const employeeEmail = empProfile?.email || 'unknown';
    const department = empProfile?.department || 'Unknown';
    const days = Math.ceil(
      (new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const leaveTypeLabel = leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1);
    const actionLabel = action === 'approved' ? 'Approved' : 'Rejected';

    // Generate professional email using AI
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
            content: `You are an HR notification system. Generate a professional leave ${action} email body (3-4 sentences). Include: employee name, leave type, dates, number of days, and who approved/rejected it. Be professional and concise. Do not include subject line or greetings like "Dear" - just the body content.`
          },
          {
            role: 'user',
            content: `Leave request ${actionLabel}: ${employeeName} (${department}) requested ${leaveTypeLabel} leave from ${leave.start_date} to ${leave.end_date} (${days} days). Reason: ${leave.reason || 'Not specified'}. ${actionLabel} by ${approverName || 'Admin'}.`
          }
        ],
        max_tokens: 300,
      }),
    });

    let emailBody: string;
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      emailBody = aiData.choices?.[0]?.message?.content || 
        `Your ${leaveTypeLabel} leave request from ${leave.start_date} to ${leave.end_date} (${days} days) has been ${actionLabel.toLowerCase()} by ${approverName || 'Admin'}.`;
    } else {
      emailBody = `Your ${leaveTypeLabel} leave request from ${leave.start_date} to ${leave.end_date} (${days} days) has been ${actionLabel.toLowerCase()} by ${approverName || 'Admin'}.`;
    }

    const subject = `Leave ${actionLabel} - ${employeeName} (${leaveTypeLabel}, ${days} days)`;

    // Log the emails (in production, integrate with Resend/SendGrid)
    console.log(`[LEAVE ${actionLabel.toUpperCase()}] To Employee: ${employeeEmail}`);
    console.log(`[LEAVE ${actionLabel.toUpperCase()}] Subject: ${subject}`);
    console.log(`[LEAVE ${actionLabel.toUpperCase()}] Body: ${emailBody}`);
    console.log(`[LEAVE ${actionLabel.toUpperCase()}] CC Admin: hr@company.com`);

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
    console.error("Error in notify-leave-action:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
