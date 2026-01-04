import { betterAuth, BetterAuthOptions } from "better-auth"
import { instantAdapter } from "better-auth-instantdb"
import { init } from "@instantdb/admin"
import schema from "@/instant.schema"
import { admin, bearer, multiSession, organization } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"

export const adminDb = init({
  schema,
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID as string,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN,
  useDateObjects: true
})

const authOptions = {
  database: instantAdapter({
    db: adminDb,
    usePlural: true,
    debugLogs: false 
  }),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },
  emailAndPassword: {
    enabled: true
  },
  plugins: [
    organization({
        async sendInvitationEmail(data) {
            console.log(data)
        },
    }),
    bearer(),
    admin({
        /* cspell:disable-next-line */
        adminUserIds: ["EXD5zjob2SD6CBWcEQ6OpLRHcyoUbnaB"],
    }),
    multiSession(),
    nextCookies(),
  ],
} satisfies BetterAuthOptions


export const auth = betterAuth({
    ...authOptions,
})

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