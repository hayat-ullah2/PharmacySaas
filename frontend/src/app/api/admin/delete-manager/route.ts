import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Deletes a manager account within the caller's pharmacy using the service role — Node runtime only.
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
  if (!token) return NextResponse.json({ error: "Sign in to remove a manager." }, { status: 401 });

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
    return NextResponse.json({ error: "Only an active pharmacy owner can remove managers." }, { status: 403 });
  }

  let body: { managerId?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const managerId = typeof body.managerId === "string" ? body.managerId : "";
  if (!managerId) return NextResponse.json({ error: "A manager id is required." }, { status: 400 });

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // Verify the target is a manager in the caller's own pharmacy before deleting.
  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, pharmacy_id, role")
    .eq("id", managerId)
    .single();
  if (targetError || !target) {
    return NextResponse.json({ error: "The manager account was not found." }, { status: 404 });
  }
  if (target.pharmacy_id !== callerProfile.pharmacy_id || target.role !== "manager") {
    return NextResponse.json({ error: "You can only remove managers in your own pharmacy." }, { status: 403 });
  }

  // Deleting the auth user cascades the profile row (profiles.id references auth.users on delete cascade).
  const { error: deleteError } = await admin.auth.admin.deleteUser(managerId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
