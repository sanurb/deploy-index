import { AccountSettingsCards } from "@daveyplate/better-auth-ui";

/**
 * Account settings page - user-scoped, no organization context.
 */
export default function AccountSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <AccountSettingsCards />
    </div>
  );
}
