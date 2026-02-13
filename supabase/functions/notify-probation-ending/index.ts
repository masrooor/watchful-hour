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
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch configurable probation period
    const { data: settingsData } = await supabase
      .from('attendance_settings')
      .select('probation_period_days')
      .limit(1)
      .single();
    const PROBATION_DAYS = settingsData?.probation_period_days || 90;

    // Find employees on probation with a joining_date
    const { data: probationEmployees, error: profError } = await supabase
      .from('profiles')
      .select('user_id, name, department, joining_date, designation')
      .eq('job_status', 'probation')
      .not('joining_date', 'is', null);

    if (profError) throw new Error(`Failed to fetch profiles: ${profError.message}`);

    const today = new Date();
    const notifications: { name: string; department: string; daysLeft: number; endDate: string; designation: string }[] = [];

    for (const emp of probationEmployees || []) {
      const joinDate = new Date(emp.joining_date);
      const probEnd = new Date(joinDate);
      probEnd.setDate(probEnd.getDate() + PROBATION_DAYS);

      const diffMs = probEnd.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Notify at 30, 14, 7, 3, 1, and 0 days before end
      if ([30, 14, 7, 3, 1, 0].includes(daysLeft)) {
        notifications.push({
          name: emp.name || 'Unknown',
          department: emp.department || 'Unassigned',
          daysLeft,
          endDate: probEnd.toISOString().split('T')[0],
          designation: emp.designation || 'N/A',
        });
      }
    }

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No probation notifications to send today.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all admin user IDs
    const { data: adminRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'hr']);

    if (roleError) throw new Error(`Failed to fetch admin roles: ${roleError.message}`);

    const adminIds = (adminRoles || []).map(r => r.user_id);

    // Build summary for AI
    const employeeList = notifications.map(n =>
      `- ${n.name} (${n.designation}, ${n.department}): probation ends ${n.endDate} (${n.daysLeft === 0 ? 'TODAY' : `${n.daysLeft} day(s) remaining`})`
    ).join('\n');

    // Generate notification message with AI
    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an HR notification system. Generate a brief, professional probation period notification. List the employees whose probation is ending soon with their details. Remind the admin to review their performance and take action (confirm as permanent or extend probation). Keep it concise and actionable.',
          },
          {
            role: 'user',
            content: `The following employees have probation periods ending soon:\n${employeeList}`,
          },
        ],
        max_tokens: 500,
      }),
    });

    let notificationBody = `Probation ending soon for: ${notifications.map(n => `${n.name} (${n.daysLeft} days left)`).join(', ')}`;

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      notificationBody = aiData.choices?.[0]?.message?.content || notificationBody;
    } else {
      console.warn(`AI Gateway error [${aiResponse.status}], using fallback message`);
    }

    // Create in-app notifications for all admins/HR
    const notificationInserts = adminIds.flatMap(adminId =>
      notifications.map(n => ({
        user_id: adminId,
        title: n.daysLeft === 0
          ? `⚠️ Probation Ended: ${n.name}`
          : `Probation Ending: ${n.name} (${n.daysLeft} day${n.daysLeft === 1 ? '' : 's'} left)`,
        message: `${n.name} from ${n.department} (${n.designation}) — probation ${n.daysLeft === 0 ? 'ends today' : `ends on ${n.endDate}`}. Please review and take action.`,
        type: 'probation',
      }))
    );

    if (notificationInserts.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationInserts);

      if (insertError) {
        console.error('Failed to insert notifications:', insertError.message);
      }
    }

    // Log email (integrate with email service like Resend/SendGrid in production)
    console.log(`[PROBATION NOTIFICATION] Sending to ${adminIds.length} admin(s)`);
    console.log(`[PROBATION NOTIFICATION] Employees: ${notifications.map(n => n.name).join(', ')}`);
    console.log(`[PROBATION NOTIFICATION] Body: ${notificationBody}`);

    return new Response(
      JSON.stringify({
        success: true,
        notified: notifications.length,
        admins: adminIds.length,
        employees: notifications.map(n => ({ name: n.name, daysLeft: n.daysLeft })),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-probation-ending:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
