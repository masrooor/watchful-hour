import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check admin or HR role
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "hr"]);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin or HR access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, name, department, cnic, phone, emergency_contact_name,
      emergency_contact_phone, address, city, date_of_birth, designation,
      employment_type, job_status, salary, joining_date, shift_start, shift_end } = body;

    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: "Email, password, and name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the auto-created profile with all fields
    if (newUser.user) {
      const profileUpdate: Record<string, any> = { name };
      if (department) profileUpdate.department = department;
      if (cnic) profileUpdate.cnic = cnic;
      if (phone) profileUpdate.phone = phone;
      if (emergency_contact_name) profileUpdate.emergency_contact_name = emergency_contact_name;
      if (emergency_contact_phone) profileUpdate.emergency_contact_phone = emergency_contact_phone;
      if (address) profileUpdate.address = address;
      if (city) profileUpdate.city = city;
      if (date_of_birth) profileUpdate.date_of_birth = date_of_birth;
      if (designation) profileUpdate.designation = designation;
      if (employment_type) profileUpdate.employment_type = employment_type;
      if (job_status) profileUpdate.job_status = job_status;
      if (salary) profileUpdate.salary = salary;
      if (joining_date) profileUpdate.joining_date = joining_date;
      if (shift_start) profileUpdate.shift_start = shift_start;
      if (shift_end) profileUpdate.shift_end = shift_end;

      await adminClient
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", newUser.user.id);
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
