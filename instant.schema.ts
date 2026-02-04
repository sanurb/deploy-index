// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      banExpires: i.date().optional(),
      banned: i.boolean().optional(),
      banReason: i.string().optional(),
      createdAt: i.date().optional(),
      email: i.string().unique().indexed().optional(),
      emailVerified: i.boolean().optional(),
      image: i.string().optional(),
      imageURL: i.string().optional(),
      name: i.string().indexed().optional(),
      role: i.string().optional(),
      type: i.string().optional(),
      updatedAt: i.date().optional(),
    }),
    accounts: i.entity({
      accessToken: i.string().optional(),
      accessTokenExpiresAt: i.date().optional(),
      accountId: i.string().unique().indexed(),
      createdAt: i.date(),
      idToken: i.string().optional(),
      password: i.string().optional(),
      providerId: i.string().indexed(),
      refreshToken: i.string().optional(),
      refreshTokenExpiresAt: i.date().optional(),
      scope: i.string().optional(),
      updatedAt: i.date(),
      userId: i.string().indexed(),
    }),
    invitations: i.entity({
      createdAt: i.date(),
      email: i.string().indexed(),
      expiresAt: i.date(),
      inviterId: i.string(),
      organizationId: i.string(),
      role: i.string().indexed().optional(),
      status: i.string().indexed(),
    }),
    jwkss: i.entity({
      createdAt: i.date(),
      expiresAt: i.date().optional(),
      privateKey: i.string(),
      publicKey: i.string(),
    }),
    members: i.entity({
      createdAt: i.date(),
      organizationId: i.string(),
      role: i.string().indexed(),
      userId: i.string(),
    }),
    organizations: i.entity({
      createdAt: i.date(),
      logo: i.string().optional(),
      metadata: i.string().optional(),
      name: i.string().indexed(),
      slug: i.string().unique().indexed(),
    }),
    serviceDependencies: i.entity({
      createdAt: i.date(),
      dependencyName: i.string().indexed(),
      serviceId: i.string().indexed(),
    }),
    serviceInterfaces: i.entity({
      branch: i.string().indexed().optional(),
      createdAt: i.date(),
      domain: i.string().indexed(),
      env: i.string().indexed(),
      runtimeId: i.string().optional(),
      runtimeType: i.string().indexed().optional(),
      serviceId: i.string().indexed(),
      updatedAt: i.date(),
    }),
    services: i.entity({
      createdAt: i.date(),
      createdById: i.string().indexed(),
      name: i.string().indexed(),
      organizationId: i.string().indexed(),
      owner: i.string().indexed(),
      repository: i.string().indexed(),
      updatedAt: i.date(),
      updatedById: i.string().indexed(),
    }),
    sessions: i.entity({
      activeOrganizationId: i.string().optional(),
      createdAt: i.date(),
      expiresAt: i.date().indexed(),
      impersonatedBy: i.string().optional(),
      ipAddress: i.string().optional(),
      token: i.string().unique(),
      updatedAt: i.date(),
      userAgent: i.string().optional(),
      userId: i.string().indexed(),
    }),
    users: i.entity({
      banExpires: i.date().optional(),
      banned: i.boolean().optional(),
      banReason: i.string().optional(),
      createdAt: i.date().optional(),
      email: i.string().unique().indexed(),
      emailVerified: i.boolean().optional(),
      image: i.string().optional(),
      name: i.string().indexed().optional(),
      role: i.string().optional(),
      updatedAt: i.date().optional(),
    }),
    verifications: i.entity({
      createdAt: i.date(),
      expiresAt: i.date(),
      identifier: i.string(),
      updatedAt: i.date(),
      value: i.string(),
    }),
  },
  links: {
    $usersLinkedPrimaryUser: {
      forward: {
        on: "$users",
        has: "one",
        label: "linkedPrimaryUser",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "linkedGuestUsers",
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
  },
  rooms: {},
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
