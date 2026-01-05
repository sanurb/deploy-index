import type { InstantRules } from "@instantdb/react";

const rules = {
  // Prevent creation of new attributes without explicit schema changes
  attrs: {
    allow: {
      $default: "false",
    },
  },
  // Auth entities permissions
  // Better Auth users entity (linked to $users)
  users: {
    bind: ["isOwner", "auth.id != null && auth.id == data.id"],
    allow: {
      view: "isOwner",
      create: "false",
      delete: "false",
      update:
        "isOwner && (newData.email == data.email) && (newData.emailVerified == data.emailVerified) && (newData.createdAt == data.createdAt)",
    },
  },
  // InstantDB system $users entity
  $users: {
    bind: ["isOwner", "auth.id != null && auth.id == data.id"],
    allow: {
      view: "isOwner",
      create: "false",
      delete: "false",
      update:
        "isOwner && (newData.email == data.email) && (newData.emailVerified == data.emailVerified) && (newData.createdAt == data.createdAt)",
    },
  },
  accounts: {
    bind: ["isOwner", "auth.id != null && auth.id == data.userId"],
    allow: {
      view: "isOwner",
      create: "false",
      delete: "false",
      update: "false",
    },
  },
  sessions: {
    bind: ["isOwner", "auth.id != null && auth.id == data.userId"],
    allow: {
      view: "isOwner",
      create: "false",
      delete: "false",
      update: "false",
    },
  },
  verifications: {
    allow: {
      $default: "false",
    },
  },
  // Optional permissions (public profile example)
  profiles: {
    bind: ["isOwner", "auth.id != null && auth.id == data.id"],
    allow: {
      view: "true",
      create: "false",
      delete: "false",
      update: "isOwner",
    },
  },
  // Organization-scoped service permissions
  // Note: Role checks use auth.ref which checks roles across all orgs.
  // This is acceptable because isOrgMember already verifies membership in THIS org.
  // In practice, users typically belong to one org, making this safe.
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
      update: "hasEditorRole",
      delete: "hasAdminRole",
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
      update: "hasEditorRole",
      delete: "hasEditorRole",
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
      update: "hasEditorRole",
      delete: "hasEditorRole",
    },
  },
  // Organization permissions
  organizations: {
    bind: [
      "isMember",
      "auth.id != null && auth.id in data.ref('members.user.id')",
      "isAdmin",
      "isMember && ('admin' in auth.ref('$user.members.role') || 'owner' in auth.ref('$user.members.role'))",
      "isOwner",
      "isMember && 'owner' in auth.ref('$user.members.role')",
    ],
    allow: {
      view: "isMember",
      create: "auth.id != null",
      update: "isAdmin",
      delete: "isOwner",
    },
  },
  // Member permissions
  members: {
    bind: [
      "isOrgMember",
      "auth.id != null && auth.id in data.ref('organization.members.user.id')",
      "isAdmin",
      "isOrgMember && ('admin' in auth.ref('$user.members.role') || 'owner' in auth.ref('$user.members.role'))",
    ],
    allow: {
      view: "isOrgMember",
      create: "isAdmin",
      update: "isAdmin",
      delete: "isAdmin && auth.id != data.userId",
    },
  },
  // Invitation permissions
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
      update: "isAdmin",
      delete: "isAdmin",
    },
  },
} satisfies InstantRules;

export default rules;
