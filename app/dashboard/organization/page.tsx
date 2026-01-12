import { OrganizationSettingsCards } from "@daveyplate/better-auth-ui";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function OrganizationPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">Organization</h1>
            <p className="text-muted-foreground">
              Manage your organization settings and preferences.
            </p>
          </div>

          <OrganizationSettingsCards />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
