"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pill,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Store,
  Boxes,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";

function homeFor(role: "admin" | "manager" | "super_admin"): string {
  if (role === "super_admin") return "/control";
  return role === "admin" ? "/admin/dashboard" : "/manager/store";
}

export default function LoginPage() {
  const { login, user, ready, resetPassword, error: authError } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, bounce to the right home.
  useEffect(() => {
    if (ready && user) {
      router.replace(homeFor(user.role));
    }
  }, [ready, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const account = await login(email, password);
      toast({
        type: "success",
        title: `Welcome back, ${account.name.split(" ").slice(-1)[0]}`,
        description:
          account.role === "admin"
            ? "Signed in to the ERP Control Center."
            : account.role === "super_admin"
              ? "Signed in to the Super Admin console."
              : "Signed in to the Pharmacy POS.",
      });
      router.replace(homeFor(account.role));
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden overflow-hidden bg-primary-700 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18) 0, transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.12) 0, transparent 45%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Pill className="h-6 w-6" />
            </span>
            <div className="leading-tight">
              <p className="text-lg font-bold">MediCare</p>
              <p className="text-xs text-primary-200">Pharmacy Management & POS</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-md text-white">
          <h1 className="text-3xl font-bold leading-tight">
            Run your entire pharmacy from one intelligent platform.
          </h1>
          <p className="mt-4 text-primary-100">
            From inventory and purchasing to point-of-sale and prescriptions —
            MediCare unifies your operations with a clean, modern experience.
          </p>
          <ul className="mt-8 space-y-3.5">
            {[
              { icon: ShieldCheck, text: "ERP control center for administrators" },
              { icon: Store, text: "Fast online-store style POS for managers" },
              { icon: Boxes, text: "Batch, expiry & stock tracking" },
              { icon: TrendingUp, text: "Real-time sales & finance insights" },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <f.icon className="h-4.5 w-4.5" />
                </span>
                <span className="text-sm text-primary-50">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-primary-200">
          © 2026 MediCare Systems · Pharmacy operations platform
        </p>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center bg-white px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Pill className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-base font-bold text-navy-900">MediCare</p>
              <p className="text-xs text-navy-400">Pharmacy Management & POS</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-navy-900">
            Sign in to your account
          </h2>
          <p className="mt-1.5 text-sm text-navy-500">
            Sign in with the account created for your pharmacy.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-navy-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@pharmacy.test"
                  className="h-11 w-full rounded-lg border border-navy-200 bg-white pl-9 pr-3 text-sm text-navy-900 placeholder:text-navy-400 transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-navy-700">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-lg border border-navy-200 bg-white pl-9 pr-10 text-sm text-navy-900 placeholder:text-navy-400 transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-navy-400 hover:text-navy-700"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  setError("");
                  try {
                    await resetPassword(email);
                    toast({ type: "success", title: "Reset email sent", description: "Check your inbox for a password reset link." });
                  } catch (resetError) {
                    setError(resetError instanceof Error ? resetError.message : "Unable to send a password reset email.");
                  }
                }}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Forgot password?
              </button>
            </div>

            {(error || authError) && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                {error || authError}
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              Sign in
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 border-t border-navy-100 pt-5 text-center text-xs leading-5 text-navy-400">
            Accounts are created by your administrator. Contact them if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}
