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
  if (!authorization?.startsWith("Bearer ")) return respond(401, { error: "Sign in as an administrator to update staff." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond(500, { error: "Staff account management is not configured on the server." });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: caller, error: authError } = await authClient.auth.getUser();
  if (authError || !caller.user) return respond(401, { error: "Your administrator session is invalid. Sign in again." });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: adminProfile, error: adminError } = await adminClient
    .from("profiles").select("role, active").eq("id", caller.user.id).maybeSingle();
  if (adminError) return respond(500, { error: `Could not verify administrator access: ${adminError.message}` });
  if (adminProfile?.role !== "admin" || !adminProfile.active) {
    return respond(403, { error: "Only an active administrator can update staff accounts." });
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return respond(400, { error: "Request body must be valid JSON." });
  }
  const id = typeof input.id === "string" ? input.id : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const active = input.active === true;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !name || name.length > 100 || !phone || phone.length > 32
    || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond(400, { error: "Enter a valid staff ID, name, email, and phone number." });
  }

  const { data: staffProfile, error: staffProfileError } = await adminClient
    .from("profiles").select("id, full_name, email, phone, active, created_at, role").eq("id", id).maybeSingle();
  if (staffProfileError) return respond(500, { error: `Could not load staff account: ${staffProfileError.message}` });
  if (!staffProfile || staffProfile.role !== "staff") return respond(404, { error: "Staff account not found." });
  const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(id);
  if (authUserError || !authUser.user) return respond(500, { error: `Could not load staff sign-in account: ${authUserError?.message || "Account not found."}` });

  const { data: updatedAuth, error: updateAuthError } = await adminClient.auth.admin.updateUserById(id, {
    email,
    email_confirm: true,
    user_metadata: { ...authUser.user.user_metadata, full_name: name, phone },
  });
  if (updateAuthError || !updatedAuth.user) return respond(400, { error: `Could not update staff sign-in details: ${updateAuthError?.message || "No user was returned."}` });

  const { data: updatedProfile, error: updateProfileError } = await adminClient
    .from("profiles")
    .update({ full_name: name, email, phone, active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, full_name, email, phone, active, created_at")
    .single();
  if (updateProfileError || !updatedProfile) {
    const { error: rollbackError } = await adminClient.auth.admin.updateUserById(id, {
      email: authUser.user.email,
      email_confirm: true,
      user_metadata: authUser.user.user_metadata,
    });
    return respond(500, {
      error: `Could not save staff profile: ${updateProfileError?.message || "No profile was returned."}${rollbackError ? ` Auth rollback also failed: ${rollbackError.message}` : " Auth changes were rolled back."}`,
    });
  }

  return respond(200, {
    staff: {
      id: updatedProfile.id,
      name: updatedProfile.full_name,
      email: updatedProfile.email,
      phone: updatedProfile.phone,
      active: updatedProfile.active,
      created: updatedProfile.created_at,
    },
  });
});
