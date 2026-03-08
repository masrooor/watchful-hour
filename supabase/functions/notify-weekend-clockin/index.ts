import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { employeeName, clockInTime, department, dayName, userId } = await req.json();

    if (!employeeName || !clockInTime || !dayName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all admin and manager users
    const { data: adminManagerRoles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['admin', 'manager']);

    const recipientIds = (adminManagerRoles || []).map(r => r.user_id);

    // Send in-app notification to employee
    if (userId) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: `Weekend Attendance on ${dayName}`,
        message: `You clocked in on ${dayName} at ${clockInTime}. Weekend attendance has been recorded and admin/managers have been notified.`,
        type: 'attendance',
      });
    }

    // Send in-app notifications to all admins and managers
    if (recipientIds.length > 0) {
      const notifications = recipientIds
        .filter(id => id !== userId) // Don't double-notify if employee is also admin/manager
        .map(recipientId => ({
          user_id: recipientId,
          title: `Weekend Clock-in: ${employeeName}`,
          message: `${employeeName} from ${department || 'Unknown'} department clocked in on ${dayName} at ${clockInTime}.`,
          type: 'attendance',
        }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }
    }

    // Log email notification
    console.log(`[WEEKEND NOTIFICATION] ${employeeName} clocked in on ${dayName} at ${clockInTime}`);
    console.log(`[WEEKEND NOTIFICATION] Notified ${recipientIds.length} admin/manager users`);

    return new Response(
      JSON.stringify({ success: true, notifiedCount: recipientIds.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-weekend-clockin:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
