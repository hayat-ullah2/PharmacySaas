// Server-side image-upload rules, shared by the upload route (and unit-tested).
// No "use client" — this runs on the Node server where the bytes are inspected.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

// MIME types we accept from the browser…
export const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

// …and the formats we let Cloudinary store (signed, so it enforces them too).
export const ALLOWED_FORMATS = "png,jpg,jpeg,webp,gif";

/**
 * Sniff the real image type from the leading bytes, so a renamed binary with a
 * spoofed Content-Type can't slip through. Returns the format or null.
 */
export function sniffImage(head: Uint8Array): "png" | "jpeg" | "gif" | "webp" | null {
  if (head.length >= 8 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return "png";
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "jpeg";
  if (head.length >= 4 && head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x38) return "gif";
  if (
    head.length >= 12 &&
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && // "RIFF"
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50 // "WEBP"
  ) return "webp";
  return null;
}

export type UploadCheck =
  | { ok: true; format: "png" | "jpeg" | "gif" | "webp" }
  | { ok: false; error: string };

/**
 * Enforce type + size + real-image content. The route calls this with the
 * actual uploaded bytes, so a crafted request cannot bypass it.
 */
export function validateImageUpload(input: { type: string; size: number; head: Uint8Array }): UploadCheck {
  if (input.size <= 0) {
    return { ok: false, error: "The file is empty." };
  }
  if (input.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Image must be 5 MB or smaller." };
  }
  if (!ALLOWED_MIME.has(input.type.toLowerCase())) {
    return { ok: false, error: "Only PNG, JPG, WebP, or GIF images are allowed." };
  }
  const format = sniffImage(input.head);
  if (!format) {
    return { ok: false, error: "That file is not a valid image." };
  }
  return { ok: true, format };
}
