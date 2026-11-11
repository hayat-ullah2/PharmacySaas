import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Uses the service-role key to create owner accounts — must stay on the Node runtime, never the client.
export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

function generatePassword(): string {
  // Mixed-case + digits, ~15 chars. base64url avoids ambiguous symbols.
  return `Mc${crypto.randomBytes(9).toString("base64url")}7`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  if (!URL || !ANON || !SERVICE) {
    return NextResponse.json({ error: "The server is not configured for pharmacy registration." }, { status: 500 });
  }

  // 1) Authenticate the caller and confirm they are the super admin.
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
    return NextResponse.json({ error: "Only the super admin can register pharmacies." }, { status: 403 });
  }

  // 2) Validate input.
  let body: {
    pharmacyName?: unknown;
    ownerName?: unknown;
    ownerEmail?: unknown;
    logoUrl?: unknown;
    password?: unknown;
    subscriptionPrice?: unknown;
    subscriptionStart?: unknown;
    subscriptionExpiry?: unknown;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const pharmacyName = typeof body.pharmacyName === "string" ? body.pharmacyName.trim() : "";
  const ownerName = typeof body.ownerName === "string" ? body.ownerName.trim() : "";
  const ownerEmail = typeof body.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";
  const logoUrl = typeof body.logoUrl === "string" ? body.logoUrl.trim() : "";
  const providedPassword = typeof body.password === "string" ? body.password : "";

  // Subscription — super-admin-set, server-validated. Price is a manual amount;
  // start falls back to today; expiry is optional (blank => no expiry).
  const rawPrice =
    typeof body.subscriptionPrice === "number"
      ? body.subscriptionPrice
      : typeof body.subscriptionPrice === "string" && body.subscriptionPrice.trim() !== ""
        ? Number(body.subscriptionPrice)
        : 0;
  const rawStart = typeof body.subscriptionStart === "string" ? body.subscriptionStart.trim() : "";
  const rawExpiry = typeof body.subscriptionExpiry === "string" ? body.subscriptionExpiry.trim() : "";

  if (pharmacyName.length < 2 || pharmacyName.length > 120) {
    return NextResponse.json({ error: "Pharmacy name must be 2–120 characters." }, { status: 400 });
  }
  if (ownerName.length < 2 || ownerName.length > 120) {
    return NextResponse.json({ error: "Owner name must be 2–120 characters." }, { status: 400 });
  }
  if (!isValidEmail(ownerEmail)) {
    return NextResponse.json({ error: "Enter a valid owner email address." }, { status: 400 });
  }
  if (providedPassword && (providedPassword.length < 8 || providedPassword.length > 72)) {
    return NextResponse.json({ error: "Owner password must be 8–72 characters (or leave it blank to auto-generate)." }, { status: 400 });
  }
  if (!Number.isFinite(rawPrice) || rawPrice < 0 || rawPrice > 99_999_999) {
    return NextResponse.json({ error: "Enter a valid subscription price (0 or more)." }, { status: 400 });
  }
  const subscriptionPrice = Math.round(rawPrice * 100) / 100;
  if (rawStart && !isIsoDate(rawStart)) {
    return NextResponse.json({ error: "Subscription start date is invalid." }, { status: 400 });
  }
  if (rawExpiry && !isIsoDate(rawExpiry)) {
    return NextResponse.json({ error: "Subscription expiry date is invalid." }, { status: 400 });
  }
  const subscriptionStart = rawStart || todayIso();
  const subscriptionExpiry = rawExpiry || null;
  if (subscriptionExpiry && subscriptionExpiry < subscriptionStart) {
    return NextResponse.json({ error: "Subscription expiry must be on or after the start date." }, { status: 400 });
  }

  // 3) Create the owner account. The DB trigger provisions the pharmacy + admin profile.
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  const password = providedPassword || generatePassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password,
    email_confirm: true,
    user_metadata: { account_type: "owner", name: ownerName, pharmacy_name: pharmacyName },
  });
  if (createError || !created.user) {
    const message = createError?.message ?? "Could not create the owner account.";
    const friendly = /already.*registered|exists/i.test(message)
      ? "An account with that email already exists."
      : message;
    return NextResponse.json({ error: friendly }, { status: 400 });
  }

  // 4) Finish provisioning the freshly-created pharmacy (trigger created it by
  //    owner_id with defaults): set the subscription and attach the logo.
  const pharmacyUpdate: Record<string, unknown> = {
    subscription_price: subscriptionPrice,
    subscription_start: subscriptionStart,
    subscription_expiry: subscriptionExpiry,
  };
  if (logoUrl) pharmacyUpdate.logo_url = logoUrl;

  const { error: updateError } = await admin
    .from("pharmacies")
    .update(pharmacyUpdate)
    .eq("owner_id", created.user.id);
  if (updateError) {
    // Non-fatal: the pharmacy and owner exist; subscription/logo just didn't save.
    // The super admin can fix it from the Control console.
    return NextResponse.json(
      { email: ownerEmail, password, warning: `Pharmacy created, but its subscription/logo failed to save: ${updateError.message}` },
      { status: 201 },
    );
  }

  return NextResponse.json({ email: ownerEmail, password }, { status: 201 });
}
