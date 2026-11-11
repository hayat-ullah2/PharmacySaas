"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/lib/toast";
import { useAuth } from "@/lib/auth";
import { usePharmacyData } from "@/lib/pharmacyData";
import { SETTINGS } from "@/lib/data";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, refreshPharmacy, changePassword } = useAuth();
  const { savePharmacy, saveRecord } = usePharmacyData();
  const [tab, setTab] = useState("general");
  const preferences = SETTINGS.find((setting) => setting.id === "workspace");

  // General
  const [pharmacyName, setPharmacyName] = useState(user?.pharmacyName ?? "");
  const [currency, setCurrency] = useState(user?.currency ?? "PKR");
  const [timezone, setTimezone] = useState(user?.timezone ?? "Asia/Karachi");
  const [language, setLanguage] = useState(user?.language ?? "en");

  // Pharmacy Profile
  const [address, setAddress] = useState(user?.pharmacyAddress ?? "");
  const [phone, setPhone] = useState(user?.pharmacyPhone ?? "");
  const [license, setLicense] = useState(user?.pharmacyLicense ?? "");
  const [taxId, setTaxId] = useState(user?.pharmacyTaxId ?? "");

  // Notifications
  const [lowStock, setLowStock] = useState(preferences?.lowStock ?? true);
  const [expiryAlerts, setExpiryAlerts] = useState(preferences?.expiryAlerts ?? true);
  const [dailySummary, setDailySummary] = useState(preferences?.dailySummary ?? false);
  const [salesAlerts, setSalesAlerts] = useState(preferences?.salesAlerts ?? true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const save = async (label: string) => {
    try {
      if (label === "General") {
        if (!pharmacyName.trim()) throw new Error("Enter a pharmacy name.");
        await savePharmacy({ name: pharmacyName.trim(), currency, timezone, language });
        await refreshPharmacy();
      } else if (label === "Pharmacy Profile") {
        await savePharmacy({ address: address.trim(), phone: phone.trim(), license_number: license.trim(), tax_id: taxId.trim() });
        await refreshPharmacy();
      } else if (label === "Notification") {
        await saveRecord("settings", { id: "workspace", lowStock, expiryAlerts, dailySummary, salesAlerts });
      } else if (label === "Security") {
        if (!currentPassword || !newPassword || !confirmPassword) {
          throw new Error("Fill in all password fields.");
        }
        if (newPassword.length < 8) throw new Error("Use a password with at least 8 characters.");
        if (newPassword !== confirmPassword) throw new Error("The new passwords do not match.");
        await changePassword(currentPassword, newPassword);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        throw new Error("Subscription billing is not connected to a payment provider yet.");
      }
      toast({ type: "success", title: "Changes saved", description: `${label} settings updated.` });
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to save changes", description: saveError instanceof Error ? saveError.message : "Please try again." });
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure your pharmacy, alerts, security, and billing."
        breadcrumbs={[{ label: "Home", href: "/admin/dashboard" }, { label: "Administration" }, { label: "Settings" }]}
      />

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "general", label: "General" },
            { value: "profile", label: "Pharmacy Profile" },
            { value: "notifications", label: "Notifications" },
            { value: "security", label: "Security" },
            { value: "billing", label: "Billing" },
          ]}
        />
      </div>

      {tab === "general" && (
        <Card>
          <CardHeader title="General Settings" subtitle="Basic preferences for your pharmacy workspace." />
          <CardBody className="space-y-4">
            <Input label="Pharmacy Name" required value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: "PKR", label: "PKR — Pakistani Rupee" },
                  { value: "USD", label: "USD — US Dollar" },
                  { value: "AED", label: "AED — UAE Dirham" },
                  { value: "GBP", label: "GBP — British Pound" },
                ]}
              />
              <Select
                label="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={[
                  { value: "Asia/Karachi", label: "Asia/Karachi (PKT)" },
                  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
                  { value: "Europe/London", label: "Europe/London (GMT)" },
                ]}
              />
              <Select
                label="Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                options={[
                  { value: "en", label: "English" },
                  { value: "ur", label: "Urdu" },
                  { value: "ar", label: "Arabic" },
                ]}
              />
            </div>
          </CardBody>
          <div className="flex justify-end border-t border-navy-100 px-5 py-3.5">
            <Button onClick={() => save("General")}><Save className="h-4 w-4" /> Save Changes</Button>
          </div>
        </Card>
      )}

      {tab === "profile" && (
        <Card>
          <CardHeader title="Pharmacy Profile" subtitle="Contact details and regulatory information." />
          <CardBody className="space-y-4">
            <Textarea label="Address" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input label="License Number" value={license} onChange={(e) => setLicense(e.target.value)} />
              <Input label="Tax ID / NTN" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </div>
          </CardBody>
          <div className="flex justify-end border-t border-navy-100 px-5 py-3.5">
            <Button onClick={() => save("Pharmacy Profile")}><Save className="h-4 w-4" /> Save Changes</Button>
          </div>
        </Card>
      )}

      {tab === "notifications" && (
        <Card>
          <CardHeader title="Notification Preferences" subtitle="Choose which alerts you want to receive." />
          <CardBody className="divide-y divide-navy-100">
            {[
              { label: "Low stock alerts", desc: "Notify when medicines fall below reorder level.", checked: lowStock, set: setLowStock },
              { label: "Expiry alerts", desc: "Notify when batches are close to expiry.", checked: expiryAlerts, set: setExpiryAlerts },
              { label: "Daily summary email", desc: "Receive a daily sales & inventory digest.", checked: dailySummary, set: setDailySummary },
              { label: "Sales & payment alerts", desc: "Notify on new sales and received payments.", checked: salesAlerts, set: setSalesAlerts },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-navy-800">{row.label}</p>
                  <p className="text-xs text-navy-500">{row.desc}</p>
                </div>
                <Toggle checked={row.checked} onChange={row.set} />
              </div>
            ))}
          </CardBody>
          <div className="flex justify-end border-t border-navy-100 px-5 py-3.5">
            <Button onClick={() => save("Notification")}><Save className="h-4 w-4" /> Save Changes</Button>
          </div>
        </Card>
      )}

      {tab === "security" && (
        <Card>
          <CardHeader title="Security" subtitle="Update your password and account protection." />
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Current Password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              <Input label="New Password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <Input label="Confirm Password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <p className="text-xs text-navy-500">Password changes are verified against your current Supabase account credentials.</p>
          </CardBody>
          <div className="flex justify-end border-t border-navy-100 px-5 py-3.5">
            <Button onClick={() => save("Security")}><Save className="h-4 w-4" /> Save Changes</Button>
          </div>
        </Card>
      )}

      {tab === "billing" && (
        <Card>
          <CardHeader title="Billing & Subscription" subtitle="Connect a payment provider before enabling subscription billing." />
          <CardBody className="space-y-4">
            <p className="rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800">
              No card data or subscription charges are collected by this app. Add and configure a billing provider before offering paid plans.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
