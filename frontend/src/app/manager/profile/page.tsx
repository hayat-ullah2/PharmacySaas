"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/utils";
import { useToast } from "@/lib/toast";

export default function ManagerProfilePage() {
  const router = useRouter();
  const { user, logout, updateProfile, changePassword } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  const [emailNotifs, setEmailNotifs] = useState(user?.emailNotifications ?? true);
  const [lowStockAlerts, setLowStockAlerts] = useState(user?.lowStockAlerts ?? true);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const saveProfile = async () => {
    try {
      await updateProfile({
        name,
        phone,
        emailNotifications: emailNotifs,
        lowStockAlerts,
      });
      toast({ type: "success", title: "Profile saved", description: "Your profile and notification preferences were updated." });
    } catch (saveError) {
      toast({ type: "danger", title: "Unable to save profile", description: saveError instanceof Error ? saveError.message : "Please try again." });
    }
  };

  const changeAccountPassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      toast({ type: "warning", title: "Missing fields", description: "Please fill in all password fields." });
      return;
    }
    if (newPw.length < 8) {
      toast({ type: "warning", title: "Password too short", description: "Use at least 8 characters." });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ type: "danger", title: "Passwords do not match", description: "New password and confirmation must match." });
      return;
    }
    try {
      await changePassword(currentPw, newPw);
      toast({ type: "success", title: "Password updated", description: "Your password was changed." });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (passwordError) {
      toast({ type: "danger", title: "Unable to update password", description: passwordError instanceof Error ? passwordError.message : "Please try again." });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (logoutError) {
      toast({ type: "danger", title: "Unable to log out", description: logoutError instanceof Error ? logoutError.message : "Please try again." });
    }
  };

  return (
    <div>
      <PageHeader
        title="My Profile"
        description="Manage your account details, preferences, and security."
        breadcrumbs={[{ label: "Home", href: "/manager" }, { label: "People & Insights" }, { label: "My Profile" }]}
        actions={
          <Button variant="danger" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profile */}
        <Card className="lg:col-span-2">
          <CardHeader title="Profile" subtitle="Your personal information" />
          <CardBody>
            <div className="mb-5 flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
                {initials(user?.name ?? "Manager")}
              </span>
              <div>
                <p className="text-lg font-bold text-navy-900">{user?.name ?? "Manager"}</p>
                <p className="text-sm text-navy-400">{user?.email ?? "Manager account"}</p>
                <div className="mt-1.5">
                  <Badge tone="primary" dot>Manager</Badge>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Email" type="email" value={user?.email ?? ""} readOnly />
              <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input label="Role" value="Manager" disabled />
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={saveProfile}>
                <Save className="h-4 w-4" /> Save Profile
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader title="Preferences" subtitle="Notification settings" />
          <CardBody className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-navy-800">Email notifications</p>
                <p className="text-xs text-navy-400">Receive daily summaries by email.</p>
              </div>
              <Toggle checked={emailNotifs} onChange={setEmailNotifs} />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-navy-800">Low-stock alerts</p>
                <p className="text-xs text-navy-400">Get notified when stock runs low.</p>
              </div>
              <Toggle checked={lowStockAlerts} onChange={setLowStockAlerts} />
            </div>
          </CardBody>
        </Card>

        {/* Security */}
        <Card className="lg:col-span-3">
          <CardHeader
            title="Security"
            subtitle="Update your password"
            action={<ShieldCheck className="h-4 w-4 text-success-500" />}
          />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Current password" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" />
              <Input label="New password" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" />
              <Input label="Confirm new password" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={changeAccountPassword}>
                <KeyRound className="h-4 w-4" /> Update Password
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
