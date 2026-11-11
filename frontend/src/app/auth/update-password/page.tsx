"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Pill } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth";

export default function UpdatePasswordPage() {
  const { updatePassword } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      router.replace("/login");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-navy-100 bg-white p-6 shadow-card sm:p-9">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-navy-500 hover:text-primary-700">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
        <div className="mt-7 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Pill className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-navy-900">Set a new password</h1>
            <p className="text-sm text-navy-500">Choose a secure password for your account.</p>
          </div>
        </div>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <Input label="New password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
          <Input label="Confirm new password" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          {error && <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            <KeyRound className="h-4 w-4" /> Update password
          </Button>
        </form>
      </section>
    </main>
  );
}
