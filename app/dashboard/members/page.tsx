import { OrganizationMembersCard } from "@daveyplate/better-auth-ui";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function MembersPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">Members</h1>
            <p className="text-muted-foreground">
              Manage your organization members and their roles.
            </p>
          </div>

          <OrganizationMembersCard />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
