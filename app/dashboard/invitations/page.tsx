import { AcceptInvitationCard } from "@daveyplate/better-auth-ui";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function InvitationsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">Invitations</h1>
            <p className="text-muted-foreground">
              Accept pending invitations or invite new members to your
              organization.
            </p>
          </div>

          <AcceptInvitationCard />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
