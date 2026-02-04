/** biome-ignore-all lint/correctness/noUnusedVariables: it's okey */

import { randomUUID } from "node:crypto";
import { instantDBAdapter } from "@daveyplate/better-auth-instantdb";
import { init } from "@instantdb/admin";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import {
  admin,
  bearer,
  jwt,
  multiSession,
  organization,
} from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";
import consola from "consola";
import schema from "@/instant.schema";
import { reactInvitationEmail } from "./email/invitation";
import { resend } from "./email/resend";
import { reactResetPasswordEmail } from "./email/reset-password";

/**
 * Access Control Configuration
 *
 * Role hierarchy:
 * - owner: Full access - can delete org, manage all settings, full service access
 * - admin: Cannot delete org, can manage members/settings, full service access
 * - member: Basic member - read-only access (Better Auth default)
 * - editor: Custom role for developers - can create/edit/delete services
 * - viewer: Custom role - read-only access to services
 */
const statement = {
  ...defaultStatements,
  // Custom service permissions
  service: ["create", "update", "delete", "read"],
} as const;

export const ac = createAccessControl(statement);

// Built-in roles with default permissions
export const owner = ac.newRole({
  ...ownerAc.statements,
  service: ["create", "update", "delete", "read"],
});

export const adminRole = ac.newRole({
  ...adminAc.statements,
  service: ["create", "update", "delete", "read"],
});

export const member = ac.newRole({
  ...memberAc.statements,
  service: ["read"],
});

// Custom product roles
export const editor = ac.newRole({
  service: ["create", "update", "delete", "read"],
});

export const viewer = ac.newRole({
  service: ["read"],
});

const from = process.env.BETTER_AUTH_EMAIL || "delivered@resend.dev";
const to = process.env.TEST_EMAIL || "";

export const adminDb = init({
  schema,
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID as string,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN,
  useDateObjects: true,
});

const authOptions = {
  database: instantDBAdapter({
    db: adminDb as never,
    usePlural: true,
    debugLogs: true,
  }),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Auto-create personal organization on user signup
          const orgName =
            user.name || user.email.split("@")[0] || "My Organization";
          const orgSlug = orgName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

          try {
            const orgId = randomUUID();
            const memberId = randomUUID();

            await adminDb.transact([
              adminDb.tx.organizations[orgId].create({
                name: orgName,
                slug: `${orgSlug}-${Date.now()}`, // Ensure uniqueness
                createdAt: new Date(),
              }),
              adminDb.tx.members[memberId]
                .create({
                  userId: user.id,
                  role: "owner",
                  organizationId: orgId,
                  createdAt: new Date(),
                })
                .link({
                  organization: orgId,
                  user: user.id,
                }),
            ]);
          } catch (error) {
            console.error("Failed to create personal organization:", error);
            // Don't throw - allow user creation to succeed even if org creation fails
            // The user can create an organization manually later
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          // Set active organization if user has one and none is set
          if (!session.activeOrganizationId) {
            try {
              const { members } = await adminDb.query({
                members: {
                  $: {
                    where: { userId: session.userId },
                    limit: 1,
                  },
                  organization: {},
                },
              });

              if (
                members &&
                members.length > 0 &&
                members[0]?.organization?.id
              ) {
                return {
                  data: {
                    ...session,
                    activeOrganizationId: members[0].organization.id,
                  },
                };
              }
            } catch (error) {
              console.error(
                "Failed to set active organization on session:",
                error
              );
            }
          }

          return { data: session };
        },
      },
    },
  },
  emailVerification: {
    async sendVerificationEmail({ user, url }) {
      const res = await resend.emails.send({
        from,
        to: to || user.email,
        subject: "Verify your email address",
        html: `<a href="${url}">Verify your email address</a>`,
      });
      console.log(res, user.email);
    },
  },
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, url }) {
      await resend.emails.send({
        from,
        to: user.email,
        subject: "Reset your password",
        react: reactResetPasswordEmail({
          username: user.email,
          resetLink: url,
        }),
      });
    },
  },
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        try {
          const inviteLink =
            process.env.NODE_ENV === "development"
              ? `http://localhost:3000/accept-invitation/${data.id}`
              : `${
                  process.env.BETTER_AUTH_URL || "https://demo.better-auth.com"
                }/accept-invitation/${data.id}`;

          consola.info("[Invitation Email] Sending invitation:", {
            to: data.email,
            organization: data.organization.name,
            inviteLink,
          });

          const result = await resend.emails.send({
            from,
            to: data.email,
            subject: "You've been invited to join an organization",
            react: reactInvitationEmail({
              username: data.email,
              invitedByUsername: data.inviter.user.name,
              invitedByEmail: data.inviter.user.email,
              teamName: data.organization.name,
              inviteLink,
            }),
          });

          if (result.error) {
            console.error("[Invitation Email] Resend API error:", result.error);
            throw new Error(
              `Failed to send invitation email: ${result.error.message}`
            );
          }

          consola.info("[Invitation Email] Email sent successfully:", {
            emailId: result.data?.id,
            to: data.email,
          });
        } catch (error) {
          consola.error(
            "[Invitation Email] Failed to send invitation email:",
            error
          );
          // Re-throw to let better-auth handle the error
          throw error;
        }
      },
    }),
    bearer(),
    admin({
      /* cspell:disable-next-line */
      adminUserIds: ["EXD5zjob2SD6CBWcEQ6OpLRHcyoUbnaB"],
    }),
    jwt({
      jwt: {
        issuer: process.env.BETTER_AUTH_URL,
      },
    }),
    multiSession(),
    nextCookies(),
  ],
  trustedOrigins: [
    "https://*.paymentsway.dev",
    "https://deploy-index.vercel.app",
    "http://localhost:4001",
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...authOptions,
});

export type Session = typeof auth.$Infer.Session;
export type ActiveOrganization = typeof auth.$Infer.ActiveOrganization;
export type OrganizationRole = ActiveOrganization["members"][number]["role"];
export type Invitation = typeof auth.$Infer.Invitation;
export type DeviceSession = Awaited<
  ReturnType<typeof auth.api.listDeviceSessions>
>[number];

async function getAllDeviceSessions(headers: Headers): Promise<unknown[]> {
  return await auth.api.listDeviceSessions({
    headers,
  });
}

async function getAllUserOrganizations(headers: Headers): Promise<unknown[]> {
  return await auth.api.listOrganizations({
    headers,
  });
}
