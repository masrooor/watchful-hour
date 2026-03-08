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

    const { leaveId } = await req.json();

    if (!leaveId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: leaveId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch leave request
    const { data: leave, error: leaveErr } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', leaveId)
      .single();

    if (leaveErr || !leave) throw new Error('Leave request not found');

    // Fetch employee profile
    const { data: empProfile } = await supabase
      .from('profiles')
      .select('name, email, department')
      .eq('user_id', leave.user_id)
      .single();

    const employeeName = empProfile?.name || 'Employee';
    const department = empProfile?.department || 'Unknown';
    const days = Math.ceil(
      (new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    const leaveTypeLabel = leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1);

    // Get all admin and HR user IDs
    const { data: adminHrRoles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['admin', 'hr']);

    const adminHrUserIds = [...new Set((adminHrRoles || []).map((r: any) => r.user_id))];

    if (adminHrUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No admin/HR users to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin/HR profiles for email
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .in('user_id', adminHrUserIds);

    const notificationMessage = `${employeeName} (${department}) has requested ${leaveTypeLabel} leave from ${leave.start_date} to ${leave.end_date} (${days} day${days > 1 ? 's' : ''}). Reason: ${leave.reason || 'Not specified'}.`;

    // Insert in-app notifications for all admin/HR users
    const notifications = adminHrUserIds.map((uid: string) => ({
      user_id: uid,
      title: `New Leave Request - ${employeeName}`,
      message: notificationMessage,
      type: 'leave',
    }));

    await supabase.from('notifications').insert(notifications);

    // Generate email using AI
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
            content: `You are an HR notification system. Generate a professional email body (3-4 sentences) notifying admin/HR about a new leave request that needs their review. Include employee name, department, leave type, dates, days, and reason. Be professional and concise. Do not include subject line or greetings.`
          },
          {
            role: 'user',
            content: `New leave request: ${employeeName} from ${department} department has requested ${leaveTypeLabel} leave from ${leave.start_date} to ${leave.end_date} (${days} days). Reason: ${leave.reason || 'Not specified'}. This request is pending approval.`
          }
        ],
        max_tokens: 300,
      }),
    });

    let emailBody = notificationMessage;
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      emailBody = aiData.choices?.[0]?.message?.content || notificationMessage;
    }

    const subject = `New Leave Request - ${employeeName} (${leaveTypeLabel}, ${days} day${days > 1 ? 's' : ''})`;

    // Log emails for each admin/HR user
    for (const profile of (adminProfiles || [])) {
      console.log(`[LEAVE REQUEST] To: ${profile.email} (${profile.name})`);
      console.log(`[LEAVE REQUEST] Subject: ${subject}`);
      console.log(`[LEAVE REQUEST] Body: ${emailBody}`);
    }

    return new Response(
      JSON.stringify({ success: true, notified: adminHrUserIds.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-leave-request:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
