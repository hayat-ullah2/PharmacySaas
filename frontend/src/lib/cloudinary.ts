"use client";

import { getAccessToken } from "./supabase";

export interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Upload an image via our server route, which validates the bytes (type, size,
 * real-image content) before forwarding to Cloudinary. The browser never sees
 * the API secret, and no direct-upload signature is ever handed out.
 */
export async function uploadImage(file: File, folder = "products"): Promise<UploadResult> {
  const token = await getAccessToken();

  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);

  // No Content-Type header — the browser sets the multipart boundary itself.
  const res = await fetch("/api/cloudinary/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const problem = await res.json().catch(() => ({}));
    throw new Error(problem.error ?? "The image upload failed.");
  }
  const result = await res.json();
  return { url: result.url as string, publicId: result.publicId as string };
}
