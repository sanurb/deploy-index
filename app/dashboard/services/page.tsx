"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { db } from "@/lib/db";

export default function ServicesPage() {
  const { user } = db.useAuth();
  const userId = user?.id && typeof user.id === "string" ? user.id : null;

  // Query user's organizations to get organizationId
  const { data: orgData } = db.useQuery(
    userId
      ? {
          members: {
            $: {
              where: { userId },
            },
            organization: {},
          },
        }
      : null
  );

  const organizations = orgData?.members?.map((m) => m.organization) || [];
  const organizationIds =
    organizations.length > 0
      ? organizations.map((org) => org.id).filter((id): id is string => !!id)
      : [];

  // Query services for user's organizations
  const { data: servicesData, isLoading } = db.useQuery(
    organizationIds.length > 0
      ? {
          services: {
            $: {
              where: {
                organizationId: { $in: organizationIds },
              },
            },
          },
        }
      : null
  );

  const services = servicesData?.services || [];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">Services</h1>
            <p className="text-muted-foreground">
              Manage and track your deployed services.
            </p>
          </div>

          {isLoading ? (
            <div className="text-muted-foreground">Loading services...</div>
          ) : (
            <>
              {services.length === 0 ? (
                <div className="rounded-lg border bg-card p-8 text-center">
                  <p className="text-muted-foreground">
                    No services found. Create your first service to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => (
                    <div
                      className="rounded-lg border bg-card p-4"
                      key={service.id}
                    >
                      <h3 className="font-semibold">{service.name}</h3>
                      {service.repository && (
                        <a
                          className="text-muted-foreground text-sm hover:underline"
                          href={service.repository}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {service.repository}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
