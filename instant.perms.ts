// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const rules = {
  attrs: {
    allow: {
      $default: "false",
    },
  },
  sessions: {
    bind: ["isOwner", "auth.id != null && auth.id == data.userId"],
    allow: {
      view: "true",
      create: "true",
      delete: "isOwner",
      update: "false",
    },
  },
  members: {
    bind: [
      "isSameOrg",
      "auth.id != null && data.organizationId in auth.ref('$user.members.organizationId')",
      "isAdmin",
      "isSameOrg && ('admin' in auth.ref('$user.members.role') || 'owner' in auth.ref('$user.members.role'))",
    ],
    allow: {
      view: "true",
      create: "isAdmin",
      delete: "isAdmin && auth.id != data.userId",
      update: "isAdmin",
    },
  },
  serviceDependencies: {
    bind: [
      "isServiceMember",
      "auth.id != null && auth.id in data.ref('service.organization.members.user.id')",
      "hasEditorRole",
      "isServiceMember && ('editor' in auth.ref('$user.members.role') || 'admin' in auth.ref('$user.members.role') || 'owner' in auth.ref('$user.members.role'))",
    ],
    allow: {
      view: "isServiceMember",
      create: "hasEditorRole",
      delete: "hasEditorRole",
      update: "hasEditorRole",
    },
  },
  services: {
    bind: [
      "isOrgMember",
      "auth.id != null && auth.id in data.ref('organization.members.user.id')",
      "hasEditorRole",
      "isOrgMember && ('editor' in auth.ref('$user.members.role') || 'admin' in auth.ref('$user.members.role') || 'owner' in auth.ref('$user.members.role'))",
      "hasAdminRole",
      "isOrgMember && ('admin' in auth.ref('$user.members.role') || 'owner' in auth.ref('$user.members.role'))",
    ],
    allow: {
      view: "isOrgMember",
      create: "hasEditorRole",
      delete: "hasAdminRole",
      update: "hasEditorRole",
    },
  },
  $users: {
    bind: ["isOwner", "auth.id != null && auth.id == data.id"],
    allow: {
      view: "true",
      create: "false",
      delete: "false",
      update:
        "isOwner && (newData.email == data.email) && (newData.emailVerified == data.emailVerified) && (newData.createdAt == data.createdAt)",
    },
  },
  profiles: {
    bind: ["isOwner", "auth.id != null && auth.id == data.id"],
    allow: {
      view: "true",
      create: "false",
      delete: "false",
      update: "isOwner",
    },
  },
  verifications: {
    allow: {
      $default: "false",
    },
  },
  users: {
    bind: ["isOwner", "auth.id != null && auth.id == data.id"],
    allow: {
      view: "true",
      create: "true",
      delete: "false",
      update:
        "isOwner && (newData.email == data.email) && (newData.emailVerified == data.emailVerified) && (newData.createdAt == data.createdAt)",
    },
  },
  serviceInterfaces: {
    bind: [
      "isServiceMember",
      "auth.id != null && auth.id in data.ref('service.organization.members.user.id')",
      "hasEditorRole",
      "isServiceMember && ('editor' in auth.ref('$user.members.role') || 'admin' in auth.ref('$user.members.role') || 'owner' in auth.ref('$user.members.role'))",
    ],
    allow: {
      view: "isServiceMember",
      create: "hasEditorRole",
      delete: "hasEditorRole",
      update: "hasEditorRole",
    },
  },
  accounts: {
    bind: ["isOwner", "auth.id != null && auth.id == data.userId"],
    allow: {
      view: "true",
      create: "true",
      delete: "false",
      update: "false",
    },
  },
  invitations: {
    bind: [
      "isOrgMember",
      "auth.id != null && auth.id in data.ref('organization.members.user.id')",
      "isAdmin",
      "isOrgMember && ('admin' in auth.ref('$user.members.role') || 'owner' in auth.ref('$user.members.role'))",
    ],
    allow: {
      view: "isAdmin",
      create: "isAdmin",
      delete: "isAdmin",
      update: "isAdmin",
    },
  },
  organizations: {
    bind: [
      "isMember",
      "auth.id != null && data.id in auth.ref('$user.members.organizationId')",
      "isAdmin",
      "isMember && ('admin' in auth.ref('$user.members.role') || 'owner' in auth.ref('$user.members.role'))",
      "isOwner",
      "isMember && 'owner' in auth.ref('$user.members.role')",
    ],
    allow: {
      // Allow viewing organizations - access control is enforced at service/resource level
      // This breaks the circular dependency with members and allows relationship queries
      view: "true",
      create: "auth.id != null",
      update: "isAdmin",
      delete: "isOwner",
    },
  },
} satisfies InstantRules;

export default rules;
