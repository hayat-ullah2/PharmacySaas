import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Permanently deletes a pharmacy tenant (its owner, managers, and all records)
// using the service role — Node runtime only, super admin only.
export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  if (!URL || !ANON || !SERVICE) {
    return NextResponse.json({ error: "The server is not configured for pharmacy management." }, { status: 500 });
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
    return NextResponse.json({ error: "Only the super admin can delete pharmacies." }, { status: 403 });
  }

  // 2) Validate input.
  let body: { pharmacyId?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const pharmacyId = typeof body.pharmacyId === "string" ? body.pharmacyId.trim() : "";
  if (!pharmacyId) return NextResponse.json({ error: "A pharmacy id is required." }, { status: 400 });

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // 3) Confirm the pharmacy exists.
  const { data: pharmacy, error: pharmacyError } = await admin
    .from("pharmacies")
    .select("id")
    .eq("id", pharmacyId)
    .single();
  if (pharmacyError || !pharmacy) {
    return NextResponse.json({ error: "The pharmacy was not found." }, { status: 404 });
  }

  // 4) Collect every member (owner + managers) of this pharmacy.
  const { data: members, error: membersError } = await admin
    .from("profiles")
    .select("id")
    .eq("pharmacy_id", pharmacyId);
  if (membersError) {
    return NextResponse.json({ error: `Could not read the pharmacy's members: ${membersError.message}` }, { status: 400 });
  }
  const memberIds = (members ?? []).map((m) => m.id as string);

  // 5) Delete in FK-safe order:
  //    a) profiles rows first — they reference pharmacies ON DELETE RESTRICT, so
  //       they must go before the pharmacy row can be removed.
  if (memberIds.length > 0) {
    const { error: profilesDeleteError } = await admin.from("profiles").delete().eq("pharmacy_id", pharmacyId);
    if (profilesDeleteError) {
      return NextResponse.json({ error: `Could not remove the pharmacy's members: ${profilesDeleteError.message}` }, { status: 400 });
    }
  }

  //    b) the pharmacy row — cascades its pharmacy_records; owner_id RESTRICT is on
  //       deleting the user, not the pharmacy, so this succeeds.
  const { error: pharmacyDeleteError } = await admin.from("pharmacies").delete().eq("id", pharmacyId);
  if (pharmacyDeleteError) {
    return NextResponse.json({ error: `Could not delete the pharmacy: ${pharmacyDeleteError.message}` }, { status: 400 });
  }

  //    c) the auth users — nothing references them now (pharmacy + profiles gone).
  const failed: string[] = [];
  for (const id of memberIds) {
    const { error: userDeleteError } = await admin.auth.admin.deleteUser(id);
    if (userDeleteError) failed.push(userDeleteError.message);
  }
  if (failed.length > 0) {
    return NextResponse.json(
      { ok: true, warning: `Pharmacy deleted, but ${failed.length} login account(s) could not be removed: ${failed.join("; ")}` },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
