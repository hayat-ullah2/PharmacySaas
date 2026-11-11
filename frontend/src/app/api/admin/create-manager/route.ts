import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Creates a manager account under the caller's pharmacy using the service role — Node runtime only.
export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  if (!URL || !ANON || !SERVICE) {
    return NextResponse.json({ error: "The server is not configured for user management." }, { status: 500 });
  }

  // 1) Authenticate the caller and confirm they are an active pharmacy owner (admin).
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) return NextResponse.json({ error: "Sign in to add a manager." }, { status: 401 });

  const caller = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerUser, error: callerError } = await caller.auth.getUser(token);
  if (callerError || !callerUser.user) {
    return NextResponse.json({ error: "Your session is invalid. Sign in again." }, { status: 401 });
  }
  const { data: callerProfile, error: profileError } = await caller
    .from("profiles")
    .select("pharmacy_id, role, status")
    .eq("id", callerUser.user.id)
    .single();
  if (profileError || !callerProfile || callerProfile.role !== "admin" || callerProfile.status !== "active") {
    return NextResponse.json({ error: "Only an active pharmacy owner can add managers." }, { status: 403 });
  }

  // 2) Validate input.
  let body: { name?: unknown; email?: unknown; password?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: "Manager name must be 2–120 characters." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid manager email address." }, { status: 400 });
  }
  if (password.length < 6 || password.length > 72) {
    return NextResponse.json({ error: "Password must be 6–72 characters." }, { status: 400 });
  }

  // 3) Create the manager auth user (account_type 'manager' so the owner-pharmacy trigger skips it).
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { account_type: "manager", name },
  });
  if (createError || !created.user) {
    const message = createError?.message ?? "Could not create the manager account.";
    const friendly = /already.*registered|exists/i.test(message) ? "An account with that email already exists." : message;
    return NextResponse.json({ error: friendly }, { status: 400 });
  }

  // 4) Link the manager profile to the owner's pharmacy. Roll back the auth user if this fails.
  const { error: linkError } = await admin.from("profiles").insert({
    id: created.user.id,
    pharmacy_id: callerProfile.pharmacy_id,
    name,
    email,
    role: "manager",
    status: "active",
  });
  if (linkError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: `Could not link the manager profile: ${linkError.message}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true, email }, { status: 201 });
}
