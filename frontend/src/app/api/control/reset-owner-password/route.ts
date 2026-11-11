import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Resets a pharmacy owner's password using the service role — Node runtime only.
export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

function generatePassword(): string {
  return `Mc${crypto.randomBytes(9).toString("base64url")}7`;
}

export async function POST(request: Request) {
  if (!URL || !ANON || !SERVICE) {
    return NextResponse.json({ error: "The server is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) return NextResponse.json({ error: "Sign in as the super admin." }, { status: 401 });

  const caller = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerUser, error: callerError } = await caller.auth.getUser();
  if (callerError || !callerUser.user) {
    return NextResponse.json({ error: "Your session is invalid. Sign in again." }, { status: 401 });
  }
  if ((callerUser.user.app_metadata as { role?: string } | null)?.role !== "super_admin") {
    return NextResponse.json({ error: "Only the super admin can reset owner passwords." }, { status: 403 });
  }

  let body: { pharmacyId?: unknown; password?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const pharmacyId = typeof body.pharmacyId === "string" ? body.pharmacyId : "";
  const providedPassword = typeof body.password === "string" ? body.password : "";
  if (!pharmacyId) return NextResponse.json({ error: "A pharmacy id is required." }, { status: 400 });
  if (providedPassword && (providedPassword.length < 8 || providedPassword.length > 72)) {
    return NextResponse.json({ error: "Password must be 8–72 characters (or leave it blank to auto-generate)." }, { status: 400 });
  }

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // Find the pharmacy's owner (the admin profile).
  const { data: pharmacy, error: pharmacyError } = await admin
    .from("pharmacies")
    .select("owner_id")
    .eq("id", pharmacyId)
    .single();
  if (pharmacyError || !pharmacy) {
    return NextResponse.json({ error: "Pharmacy not found." }, { status: 404 });
  }

  const { data: owner, error: ownerError } = await admin
    .from("profiles")
    .select("email")
    .eq("id", pharmacy.owner_id)
    .single();
  if (ownerError || !owner) {
    return NextResponse.json({ error: "Owner account not found." }, { status: 404 });
  }

  const password = providedPassword || generatePassword();
  const { error: updateError } = await admin.auth.admin.updateUserById(pharmacy.owner_id, { password });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ email: owner.email, password }, { status: 200 });
}
