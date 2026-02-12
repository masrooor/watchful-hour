import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { employeeName, clockInTime, department, managerEmail } = await req.json();

    if (!employeeName || !clockInTime) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: employeeName, clockInTime' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to generate a professional notification message
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
            content: 'You are an HR notification system. Generate a brief, professional late arrival notification email body (2-3 sentences max). Include the employee name, clock-in time, and department. Be factual, not judgmental.'
          },
          {
            role: 'user',
            content: `Employee ${employeeName} from ${department || 'Unknown'} department clocked in late at ${clockInTime}. The expected time was 9:00 AM.`
          }
        ],
        max_tokens: 200,
      }),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      throw new Error(`AI Gateway error [${aiResponse.status}]: ${errBody}`);
    }

    const aiData = await aiResponse.json();
    const notificationMessage = aiData.choices?.[0]?.message?.content || 
      `Late arrival: ${employeeName} clocked in at ${clockInTime}.`;

    // Log notification (in production, integrate with email service like Resend/SendGrid)
    console.log(`[LATE NOTIFICATION] To: ${managerEmail || 'hr@company.com'}`);
    console.log(`[LATE NOTIFICATION] Subject: Late Arrival - ${employeeName}`);
    console.log(`[LATE NOTIFICATION] Body: ${notificationMessage}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification: {
          to: managerEmail || 'hr@company.com',
          subject: `Late Arrival - ${employeeName}`,
          body: notificationMessage,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-late-arrival:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
