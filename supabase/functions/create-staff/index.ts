import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond(405, { error: "Method not allowed." });

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond(401, { error: "Sign in as an administrator to create staff accounts." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond(500, { error: "Staff account provisioning is not configured on the server." });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return respond(401, { error: "Your administrator session is invalid. Sign in again." });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: adminProfile, error: adminProfileError } = await adminClient
    .from("profiles")
    .select("role, active")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (adminProfileError) return respond(500, { error: `Could not verify administrator access: ${adminProfileError.message}` });
  if (adminProfile?.role !== "admin" || !adminProfile.active) {
    return respond(403, { error: "Only an active administrator can create staff accounts." });
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return respond(400, { error: "Request body must be valid JSON." });
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!name || name.length > 100 || !phone || phone.length > 32
    || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || password.length < 8 || password.length > 128 || !password.trim()) {
    return respond(400, { error: "Enter a valid name, email, phone number, and password of 8 to 128 characters." });
  }

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, phone },
  });
  if (createError || !createdUser.user) {
    return respond(400, { error: createError?.message || "Supabase did not create the staff auth user." });
  }

  const { data: staffProfile, error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: createdUser.user.id,
      full_name: name,
      email,
      phone,
      role: "staff",
      active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" })
    .select("id, full_name, email, phone, active, created_at")
    .single();
  if (profileError || !staffProfile) {
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(createdUser.user.id);
    const cleanupStatus = cleanupError
      ? ` Auth-user cleanup also failed: ${cleanupError.message}`
      : " The incomplete auth user was removed.";
    return respond(500, {
      error: `Could not save the staff profile: ${profileError?.message || "No profile was returned."}${cleanupStatus}`,
    });
  }

  return respond(201, {
    staff: {
      id: staffProfile.id,
      name: staffProfile.full_name,
      email: staffProfile.email,
      phone: staffProfile.phone,
      active: staffProfile.active,
      created: staffProfile.created_at,
    },
  });
});
