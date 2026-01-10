import { AccountSettingsCards } from "@daveyplate/better-auth-ui";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences.
            </p>
          </div>

          <AccountSettingsCards />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
