"use client";

import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { PharmacyDataProvider } from "@/lib/pharmacyData";
import { ToastProvider } from "@/lib/toast";
import { useAuth } from "@/lib/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PharmacyDataProvider>
        <PharmacyProviders>{children}</PharmacyProviders>
      </PharmacyDataProvider>
    </AuthProvider>
  );
}

function PharmacyProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <CartProvider key={user?.pharmacyId ?? "signed-out"}>
      <ToastProvider>{children}</ToastProvider>
    </CartProvider>
  );
}
