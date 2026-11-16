import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Update a manager in the caller's pharmacy (rename / suspend / reset password)
// using the service role — Node runtime only.
export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  if (!URL || !ANON || !SERVICE) {
    return NextResponse.json({ error: "The server is not configured for user management." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) return NextResponse.json({ error: "Sign in to manage users." }, { status: 401 });

  const caller = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerUser, error: callerError } = await caller.auth.getUser();
  if (callerError || !callerUser.user) {
    return NextResponse.json({ error: "Your session is invalid. Sign in again." }, { status: 401 });
  }
  const { data: callerProfile, error: profileError } = await caller
    .from("profiles")
    .select("pharmacy_id, role, status")
    .eq("id", callerUser.user.id)
    .single();
  if (profileError || !callerProfile || callerProfile.role !== "admin" || callerProfile.status !== "active") {
    return NextResponse.json({ error: "Only an active pharmacy owner can manage users." }, { status: 403 });
  }

  let body: { managerId?: unknown; action?: unknown; name?: unknown; status?: unknown; password?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const managerId = typeof body.managerId === "string" ? body.managerId : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!managerId) return NextResponse.json({ error: "A manager id is required." }, { status: 400 });
  if (!["rename", "set-status", "reset-password"].includes(action)) {
    return NextResponse.json({ error: "Unsupported user operation." }, { status: 400 });
  }

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // The target must be a manager in the caller's own pharmacy.
  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, pharmacy_id, role")
    .eq("id", managerId)
    .single();
  if (targetError || !target) {
    return NextResponse.json({ error: "The manager account was not found." }, { status: 404 });
  }
  if (target.pharmacy_id !== callerProfile.pharmacy_id || target.role !== "manager") {
    return NextResponse.json({ error: "You can only manage managers in your own pharmacy." }, { status: 403 });
  }

  if (action === "rename") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 120) {
      return NextResponse.json({ error: "Manager name must be 2–120 characters." }, { status: 400 });
    }
    const { error: profErr } = await admin.from("profiles").update({ name }).eq("id", managerId).eq("pharmacy_id", callerProfile.pharmacy_id);
    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });
    // Keep the auth metadata name in sync (merge to preserve account_type).
    const { data: existing } = await admin.auth.admin.getUserById(managerId);
    await admin.auth.admin.updateUserById(managerId, {
      user_metadata: { ...(existing?.user?.user_metadata ?? {}), name },
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (action === "set-status") {
    const status = body.status === "inactive" ? "inactive" : body.status === "active" ? "active" : "";
    if (!status) return NextResponse.json({ error: "A valid status is required." }, { status: 400 });
    const { error: statusErr } = await admin.from("profiles").update({ status }).eq("id", managerId).eq("pharmacy_id", callerProfile.pharmacy_id);
    if (statusErr) return NextResponse.json({ error: statusErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, status }, { status: 200 });
  }

  // reset-password
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 6 || password.length > 72) {
    return NextResponse.json({ error: "Password must be 6–72 characters." }, { status: 400 });
  }
  const { error: pwErr } = await admin.auth.admin.updateUserById(managerId, { password });
  if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}
