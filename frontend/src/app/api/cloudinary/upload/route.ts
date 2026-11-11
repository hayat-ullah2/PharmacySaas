import crypto from "crypto";
import { NextResponse } from "next/server";
import { ALLOWED_FORMATS, MAX_UPLOAD_BYTES, validateImageUpload } from "@/lib/uploadValidation";

// Proxies image uploads to Cloudinary AFTER validating the actual bytes on the
// server — type, size, and real-image content — so a crafted request can't
// upload large or non-image files. The API secret never reaches the browser.
export const runtime = "nodejs";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Keep uploads inside this app's own Cloudinary namespace. */
function sanitizeFolder(input: unknown): string {
  const raw = typeof input === "string" ? input.trim() : "";
  const safe = raw.replace(/[^a-zA-Z0-9/_-]/g, "");
  const scoped = safe.startsWith("medicare") ? safe : `medicare/${safe || "misc"}`;
  return scoped.replace(/\/+/g, "/").replace(/\/$/, "");
}

/** Only authenticated pharmacy users may upload. */
async function isAuthenticated(token: string | null): Promise<boolean> {
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return NextResponse.json({ error: "Cloudinary is not configured on the server." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  if (!(await isAuthenticated(token))) {
    return NextResponse.json({ error: "Sign in to upload images." }, { status: 401 });
  }

  // Reject oversized bodies before buffering them into memory.
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength && declaredLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file was provided." }, { status: 400 });
  }
  const folder = sanitizeFolder(form.get("folder"));

  const bytes = Buffer.from(await file.arrayBuffer());
  const check = validateImageUpload({ type: file.type, size: bytes.length, head: bytes.subarray(0, 16) });
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  // Signed upload: sign every non-file param (alphabetical) with the secret.
  // allowed_formats is signed, so Cloudinary also rejects non-image formats.
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `allowed_formats=${ALLOWED_FORMATS}&folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(toSign + API_SECRET).digest("hex");

  const ext = check.format === "jpeg" ? "jpg" : check.format;
  const cloudForm = new FormData();
  cloudForm.append("file", new Blob([bytes], { type: file.type }), `upload.${ext}`);
  cloudForm.append("api_key", API_KEY);
  cloudForm.append("timestamp", String(timestamp));
  cloudForm.append("folder", folder);
  cloudForm.append("allowed_formats", ALLOWED_FORMATS);
  cloudForm.append("signature", signature);

  // resource_type is pinned to 'image' by the endpoint path.
  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: cloudForm,
  });
  if (!uploadRes.ok) {
    const problem = await uploadRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: (problem as { error?: { message?: string } })?.error?.message ?? "The image upload failed." },
      { status: 400 },
    );
  }
  const result = (await uploadRes.json()) as { secure_url: string; public_id: string };
  return NextResponse.json({ url: result.secure_url, publicId: result.public_id }, { status: 200 });
}
