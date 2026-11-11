"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.role === "admin") router.replace("/admin/dashboard");
    else router.replace("/manager/store");
  }, [ready, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-50">
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-primary-600 text-white">
          <Pill className="h-6 w-6" />
        </span>
        <p className="text-sm font-medium text-navy-500">Loading MediCare…</p>
      </div>
    </div>
  );
}
