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

    const { title, content, priority, authorId } = await req.json();

    if (!title || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active employee profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, email, name')
      .eq('job_status', 'active')
      .or('job_status.eq.probation');

    // Also get probation employees
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('user_id, email, name');

    const employees = allProfiles || [];

    // Create in-app notifications for all employees
    const notifications = employees
      .filter((p: any) => p.user_id !== authorId)
      .map((p: any) => ({
        user_id: p.user_id,
        title: `📢 ${title}`,
        message: content.length > 200 ? content.substring(0, 200) + '...' : content,
        type: 'announcement',
      }));

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    // Log emails (in production, integrate with email service like Resend/SendGrid)
    const emailRecipients = employees.filter((p: any) => p.email);
    for (const emp of emailRecipients) {
      console.log(`[ANNOUNCEMENT EMAIL] To: ${emp.email}`);
      console.log(`[ANNOUNCEMENT EMAIL] Subject: 📢 ${title}`);
      console.log(`[ANNOUNCEMENT EMAIL] Priority: ${priority}`);
      console.log(`[ANNOUNCEMENT EMAIL] Body: ${content}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notified: notifications.length,
        emailsLogged: emailRecipients.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-announcement:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
