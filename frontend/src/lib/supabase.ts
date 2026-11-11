"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to frontend/.env.local.",
    );
  }

  // Cookie-based session storage so the Next.js middleware can read auth on the server.
  client ??= createBrowserClient(url, anonKey);
  return client;
}

/**
 * Returns a valid access token for calling our server API routes, refreshing it
 * first if it has expired or is about to. Throws if there is no recoverable session.
 */
export async function getAccessToken(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error("Your session expired. Please sign in again.");

  const expiresSoon = !session.expires_at || session.expires_at * 1000 < Date.now() + 60_000;
  if (expiresSoon) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error || !refreshed.session) throw new Error("Your session expired. Please sign in again.");
    return refreshed.session.access_token;
  }
  return session.access_token;
}
