// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

export const _schema = i.schema({
  entities: {
    // InstantDB system entity
    $users: i.entity({
      name: i.string().indexed().optional(),
      email: i.string().unique().indexed(),
      emailVerified: i.boolean().optional(),
      image: i.string().optional(),
      createdAt: i.date().optional(),
      updatedAt: i.date().optional(),
      role: i.string().optional(),
      banned: i.boolean().optional(),
      banReason: i.string().optional(),
      banExpires: i.date().optional(),
    }),
    // Better Auth authentication entity
    users: i.entity({
      name: i.string().indexed().optional(),
      email: i.string().unique().indexed(),
      emailVerified: i.boolean().optional(),
      image: i.string().optional(),
      createdAt: i.date().optional(),
      updatedAt: i.date().optional(),
      role: i.string().optional(),
      banned: i.boolean().optional(),
      banReason: i.string().optional(),
      banExpires: i.date().optional(),
    }),
    sessions: i.entity({
      expiresAt: i.date().indexed(),
      token: i.string().unique(),
      createdAt: i.date(),
      updatedAt: i.date(),
      ipAddress: i.string().optional(),
      userAgent: i.string().optional(),
      userId: i.string().indexed(),
      activeOrganizationId: i.string().optional(),
      impersonatedBy: i.string().optional(),
    }),
    accounts: i.entity({
      accountId: i.string().unique().indexed(),
      providerId: i.string().indexed(),
      userId: i.string().indexed(),
      accessToken: i.string().optional(),
      refreshToken: i.string().optional(),
      idToken: i.string().optional(),
      accessTokenExpiresAt: i.date().optional(),
      refreshTokenExpiresAt: i.date().optional(),
      scope: i.string().optional(),
      password: i.string().optional(),
      createdAt: i.date(),
      updatedAt: i.date(),
    }),
    verifications: i.entity({
      identifier: i.string(),
      value: i.string(),
      expiresAt: i.date(),
      createdAt: i.date(),
      updatedAt: i.date(),
    }),
    jwkss: i.entity({
      publicKey: i.string(),
      privateKey: i.string(),
      createdAt: i.date(),
      expiresAt: i.date().optional(),
    }),
    organizations: i.entity({
      name: i.string().indexed(),
      slug: i.string().unique().indexed(),
      logo: i.string().optional(),
      createdAt: i.date(),
      metadata: i.string().optional(),
    }),
    members: i.entity({
      organizationId: i.string(),
      userId: i.string(),
      role: i.string().indexed(),
      createdAt: i.date(),
    }),
    invitations: i.entity({
      organizationId: i.string(),
      email: i.string().indexed(),
      role: i.string().optional().indexed(),
      status: i.string().indexed(),
      expiresAt: i.date(),
      createdAt: i.date(),
      inviterId: i.string(),
    }),
    services: i.entity({
      name: i.string().indexed(),
      owner: i.string().indexed(),
      repository: i.string().indexed(),
      organizationId: i.string().indexed(),
      createdAt: i.date(),
      updatedAt: i.date(),
      createdById: i.string().indexed(),
      updatedById: i.string().indexed(),
    }),
    serviceInterfaces: i.entity({
      serviceId: i.string().indexed(),
      domain: i.string().indexed(),
      env: i.string().indexed(),
      branch: i.string().indexed().optional(),
      runtimeType: i.string().indexed().optional(),
      runtimeId: i.string().optional(),
      createdAt: i.date(),
      updatedAt: i.date(),
    }),
    serviceDependencies: i.entity({
      serviceId: i.string().indexed(),
      dependencyName: i.string().indexed(),
      createdAt: i.date(),
    }),
  },
  links: {
    // Link Better Auth users entity to InstantDB $users system entity
    users$user: {
      forward: {
        on: "users",
        has: "one",
        label: "$user",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "one",
        label: "user",
      },
    },
    // Better Auth links - sessions and accounts point to users entity
    sessionsUser: {
      forward: {
        on: "sessions",
        has: "one",
        label: "user",
        onDelete: "cascade",
      },
      reverse: {
        on: "users",
        has: "many",
        label: "sessions",
      },
    },
    accountsUser: {
      forward: {
        on: "accounts",
        has: "one",
        label: "user",
        onDelete: "cascade",
      },
      reverse: {
        on: "users",
        has: "many",
        label: "accounts",
      },
    },
    membersOrganization: {
      forward: {
        on: "members",
        has: "one",
        label: "organization",
        onDelete: "cascade",
      },
      reverse: {
        on: "organizations",
        has: "many",
        label: "members",
      },
    },
    membersUser: {
      forward: {
        on: "members",
        has: "one",
        label: "user",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "members",
      },
    },
    invitationsOrganization: {
      forward: {
        on: "invitations",
        has: "one",
        label: "organization",
        onDelete: "cascade",
      },
      reverse: {
        on: "organizations",
        has: "many",
        label: "invitations",
      },
    },
    invitationsInviter: {
      forward: {
        on: "invitations",
        has: "one",
        label: "inviter",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "invitations",
      },
    },
    servicesOrganization: {
      forward: {
        on: "services",
        has: "one",
        label: "organization",
        onDelete: "cascade",
      },
      reverse: {
        on: "organizations",
        has: "many",
        label: "services",
      },
    },
    servicesCreator: {
      forward: {
        on: "services",
        has: "one",
        label: "creator",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "createdServices",
      },
    },
    servicesUpdater: {
      forward: {
        on: "services",
        has: "one",
        label: "updater",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "updatedServices",
      },
    },
    serviceInterfacesService: {
      forward: {
        on: "serviceInterfaces",
        has: "one",
        label: "service",
        onDelete: "cascade",
      },
      reverse: {
        on: "services",
        has: "many",
        label: "interfaces",
      },
    },
    serviceDependenciesService: {
      forward: {
        on: "serviceDependencies",
        has: "one",
        label: "service",
        onDelete: "cascade",
      },
      reverse: {
        on: "services",
        has: "many",
        label: "dependencies",
      },
    },
  },
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
