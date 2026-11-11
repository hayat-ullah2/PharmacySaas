import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const appOrigin = Deno.env.get("APP_ORIGIN")?.replace(/\/$/, "");
const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin ?? "",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) return response({ error: "Authentication required" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey || !appOrigin) {
    return response({ error: "The manager invitation service is not configured" }, 500);
  }

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData.user) return response({ error: "Invalid session" }, 401);

  const { data: profile, error: profileError } = await callerClient
    .from("profiles")
    .select("pharmacy_id, role, status")
    .eq("id", authData.user.id)
    .single();
  if (profileError || !profile || profile.role !== "admin" || profile.status !== "active") {
    return response({ error: "Only an active pharmacy owner can invite managers" }, 403);
  }

  let body: { action?: unknown; name?: unknown; email?: unknown; id?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return response({ error: "Invalid JSON request body" }, 400);
  }

  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (body.action === "set-status") {
    const id = typeof body.id === "string" ? body.id : "";
    const status = body.status === "inactive" ? "inactive" : body.status === "active" ? "active" : "";
    if (!id || !status) return response({ error: "A manager id and valid status are required" }, 400);

    const { data: target, error: targetError } = await adminClient
      .from("profiles")
      .select("id, pharmacy_id, role")
      .eq("id", id)
      .single();
    if (targetError || !target || target.pharmacy_id !== profile.pharmacy_id || target.role !== "manager") {
      return response({ error: "The manager account was not found in this pharmacy" }, 404);
    }

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ status })
      .eq("id", id)
      .eq("pharmacy_id", profile.pharmacy_id);
    if (updateError) return response({ error: updateError.message }, 500);
    return response({ updated: true }, 200);
  }

  if (body.action !== undefined && body.action !== "invite") {
    return response({ error: "Unsupported manager operation" }, 400);
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response({ error: "Enter a valid manager name and email address" }, 400);
  }

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    { data: { name }, redirectTo: `${appOrigin}/auth/update-password` },
  );
  if (inviteError || !invited.user) {
    return response({ error: inviteError?.message ?? "The invitation could not be created" }, 400);
  }

  const { error: saveProfileError } = await adminClient.from("profiles").upsert({
    id: invited.user.id,
    pharmacy_id: profile.pharmacy_id,
    name,
    email,
    role: "manager",
    status: "active",
  });
  if (saveProfileError) {
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(invited.user.id);
    return response({
      error: cleanupError
        ? `${saveProfileError.message}. User cleanup also failed: ${cleanupError.message}`
        : saveProfileError.message,
    }, 500);
  }

  return response({ invited: true }, 200);
});
