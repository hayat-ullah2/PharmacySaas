import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Server-side role enforcement for every protected area.
 * Runs before the page renders, so a manager cannot reach /admin/* by typing the URL —
 * they are redirected regardless of what the client-side guard does.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  // If Supabase isn't configured, don't lock everyone out of the app.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Resolve the caller's role: super admin from the JWT, owner/manager from their profile.
  let role: "super_admin" | "admin" | "manager" | null = null;
  if (user) {
    if ((user.app_metadata as { role?: string } | null)?.role === "super_admin") {
      role = "super_admin";
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.status === "active" && (profile.role === "admin" || profile.role === "manager")) {
        role = profile.role;
      }
    }
  }

  const redirect = (to: string) => NextResponse.redirect(new URL(to, request.url));

  const inControl = path === "/control" || path.startsWith("/control/");
  const inAdmin = path === "/admin" || path.startsWith("/admin/");
  const inManager = path === "/manager" || path.startsWith("/manager/");

  // Super Admin console — super admin only. There is a single sign-in page for
  // everyone (/login); the old /control/login screen is retired.
  if (inControl) {
    if (path === "/control/login") return redirect(role === "super_admin" ? "/control" : "/login");
    if (role === "super_admin") return response;
    if (!role) return redirect("/login");
    return redirect(role === "admin" ? "/admin/dashboard" : "/manager");
  }

  // Owner ERP — admins only.
  if (inAdmin) {
    if (!role) return redirect("/login");
    if (role === "admin") return response;
    return redirect(role === "super_admin" ? "/control" : "/manager");
  }

  // Manager POS — managers only.
  if (inManager) {
    if (!role) return redirect("/login");
    if (role === "manager") return response;
    return redirect(role === "super_admin" ? "/control" : "/admin/dashboard");
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/manager", "/manager/:path*", "/control", "/control/:path*"],
};
