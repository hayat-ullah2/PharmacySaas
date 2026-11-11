"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Role } from "./types";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  emailNotifications: boolean;
  lowStockAlerts: boolean;
  role: Extract<Role, "admin" | "manager"> | "super_admin";
  pharmacyId: string;
  pharmacyName: string;
  pharmacyLogo: string;
  pharmacyAddress: string;
  pharmacyPhone: string;
  pharmacyLicense: string;
  pharmacyTaxId: string;
  currency: string;
  timezone: string;
  language: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  ready: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<SessionUser>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: {
    name: string;
    phone: string;
    emailNotifications: boolean;
    lowStockAlerts: boolean;
  }) => Promise<void>;
  updatePharmacyName: (name: string) => void;
  refreshPharmacy: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface SupabaseAuthUser {
  id: string;
  email?: string;
  app_metadata?: { role?: string } | null;
  user_metadata?: { name?: string } | null;
}

function isSuperAdmin(user: SupabaseAuthUser): boolean {
  return user.app_metadata?.role === "super_admin";
}

/** Session for the super admin, who has no pharmacy or profile row. */
function buildSuperAdmin(user: SupabaseAuthUser): SessionUser {
  return {
    id: user.id,
    name: user.user_metadata?.name || "Super Admin",
    email: user.email ?? "",
    phone: "",
    emailNotifications: false,
    lowStockAlerts: false,
    role: "super_admin",
    pharmacyId: "",
    pharmacyName: "",
    pharmacyLogo: "",
    pharmacyAddress: "",
    pharmacyPhone: "",
    pharmacyLicense: "",
    pharmacyTaxId: "",
    currency: "PKR",
    timezone: "Asia/Karachi",
    language: "en",
  };
}

async function loadProfile(userId: string): Promise<SessionUser> {
  const supabase = getSupabaseClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, email, phone, email_notifications, low_stock_alerts, role, status, pharmacy_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || profile.status !== "active") {
    throw new Error("This account does not have an active pharmacy profile.");
  }
  if (profile.role !== "admin" && profile.role !== "manager") {
    throw new Error("This account has an unsupported pharmacy role.");
  }

  const { data: pharmacy, error: pharmacyError } = await supabase
    .from("pharmacies")
    .select("id, name, logo_url, address, phone, license_number, tax_id, currency, timezone, language")
    .eq("id", profile.pharmacy_id)
    .single();

  if (pharmacyError) throw pharmacyError;

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? "",
    emailNotifications: profile.email_notifications,
    lowStockAlerts: profile.low_stock_alerts,
    role: profile.role,
    pharmacyId: profile.pharmacy_id,
    pharmacyName: pharmacy.name,
    pharmacyLogo: pharmacy.logo_url ?? "",
    pharmacyAddress: pharmacy.address,
    pharmacyPhone: pharmacy.phone,
    pharmacyLicense: pharmacy.license_number,
    pharmacyTaxId: pharmacy.tax_id,
    currency: pharmacy.currency,
    timezone: pharmacy.timezone,
    language: pharmacy.language,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(() => !isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = getSupabaseClient();
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setReady(true);
      }
    });

    void supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (sessionError) throw sessionError;
      if (!active) return;

      if (!data.session) {
        setUser(null);
        setReady(true);
        return;
      }

      const sessionUser = data.session.user as SupabaseAuthUser;
      const profile = isSuperAdmin(sessionUser)
        ? buildSuperAdmin(sessionUser)
        : await loadProfile(sessionUser.id);
      if (active) setUser(profile);
    }).catch((loadError: unknown) => {
      if (!active) return;
      setError(loadError instanceof Error ? loadError.message : "Unable to load your pharmacy account.");
      setUser(null);
    }).finally(() => {
      if (active) setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (signInError) throw signInError;
    if (!data.user) throw new Error("Supabase did not return a signed-in user.");

    try {
      const sessionUser = data.user as SupabaseAuthUser;
      const profile = isSuperAdmin(sessionUser)
        ? buildSuperAdmin(sessionUser)
        : await loadProfile(sessionUser.id);
      setUser(profile);
      return profile;
    } catch (profileError) {
      await supabase.auth.signOut();
      throw profileError;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabaseClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/update-password` },
    );
    if (resetError) throw resetError;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error: updateError } = await getSupabaseClient().auth.updateUser({ password });
    if (updateError) throw updateError;
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error("Sign in before changing your password.");
    const supabase = getSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) throw signInError;
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;
  }, [user]);

  const updatePharmacyName = useCallback((name: string) => {
    setUser((current) => current ? { ...current, pharmacyName: name } : current);
  }, []);

  const refreshPharmacy = useCallback(async () => {
    if (!user) throw new Error("Sign in before refreshing pharmacy settings.");
    const { data: pharmacy, error: pharmacyError } = await getSupabaseClient()
      .from("pharmacies")
      .select("id, name, logo_url, address, phone, license_number, tax_id, currency, timezone, language")
      .eq("id", user.pharmacyId)
      .single();
    if (pharmacyError) throw pharmacyError;
    setUser((current) => current ? {
      ...current,
      pharmacyName: pharmacy.name,
      pharmacyLogo: pharmacy.logo_url ?? "",
      pharmacyAddress: pharmacy.address,
      pharmacyPhone: pharmacy.phone,
      pharmacyLicense: pharmacy.license_number,
      pharmacyTaxId: pharmacy.tax_id,
      currency: pharmacy.currency,
      timezone: pharmacy.timezone,
      language: pharmacy.language,
    } : current);
  }, [user]);

  const updateProfile = useCallback(async (updates: {
    name: string;
    phone: string;
    emailNotifications: boolean;
    lowStockAlerts: boolean;
  }) => {
    if (!user) throw new Error("Sign in before updating your profile.");
    const { error: profileError } = await getSupabaseClient()
      .from("profiles")
      .update({
        name: updates.name.trim(),
        phone: updates.phone.trim(),
        email_notifications: updates.emailNotifications,
        low_stock_alerts: updates.lowStockAlerts,
      })
      .eq("id", user.id);
    if (profileError) throw profileError;
    setUser((current) => current ? {
      ...current,
      name: updates.name.trim(),
      phone: updates.phone.trim(),
      emailNotifications: updates.emailNotifications,
      lowStockAlerts: updates.lowStockAlerts,
    } : current);
  }, [user]);

  const logout = useCallback(async () => {
    const { error: signOutError } = await getSupabaseClient().auth.signOut();
    if (signOutError) throw signOutError;
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, error, login, resetPassword, updatePassword, changePassword, updateProfile, updatePharmacyName, refreshPharmacy, logout }),
    [user, ready, error, login, resetPassword, updatePassword, changePassword, updateProfile, updatePharmacyName, refreshPharmacy, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
