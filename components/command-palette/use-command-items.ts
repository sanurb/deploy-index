import {
  Download,
  Globe,
  Package,
  Plus,
  Settings,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { CommandAction, CommandPaletteProps } from "./types";

export function useCommandItems(
  props: CommandPaletteProps & { onClose: () => void }
): CommandAction[] {
  const router = useRouter();

  return useMemo(() => {
    const {
      slug,
      services,
      canCreate,
      onCreateService,
      onSetQuery,
      onSetOwner,
      groupedServices,
      onClose,
    } = props;
    const items: CommandAction[] = [];

    // --- Static navigation ---
    items.push({
      id: "nav-services",
      category: "navigate",
      label: "Go to Services",
      icon: Package,
      url: `/organization/${slug}/services`,
      action: () => {
        router.push(`/organization/${slug}/services`);
        onClose();
      },
    });

    items.push({
      id: "nav-members",
      category: "navigate",
      label: "Go to Members",
      icon: Users,
      url: `/organization/${slug}/members`,
      action: () => {
        router.push(`/organization/${slug}/members`);
        onClose();
      },
    });

    items.push({
      id: "nav-invitations",
      category: "navigate",
      label: "Go to Invitations",
      icon: UserPlus,
      url: `/organization/${slug}/invitations`,
      action: () => {
        router.push(`/organization/${slug}/invitations`);
        onClose();
      },
    });

    items.push({
      id: "nav-settings",
      category: "navigate",
      label: "Go to Settings",
      icon: Settings,
      url: `/organization/${slug}/settings`,
      action: () => {
        router.push(`/organization/${slug}/settings`);
        onClose();
      },
    });

    // --- Dynamic: one per service ---
    for (const service of services) {
      items.push({
        id: `service-${service.id}`,
        category: "navigate",
        label: service.name,
        description: `Service · ${service.owner}`,
        icon: Package,
        hideInEmptyState: true,
        action: () => {
          onSetQuery(service.name);
          onClose();
        },
      });
    }

    // --- Dynamic: one per unique domain ---
    const seenDomains = new Set<string>();
    for (const service of services) {
      if (!service.interfaces) continue;
      for (const iface of service.interfaces) {
        if (iface.domain && !seenDomains.has(iface.domain)) {
          seenDomains.add(iface.domain);
          items.push({
            id: `domain-${iface.domain}`,
            category: "navigate",
            label: iface.domain,
            description: `Domain · ${service.name}`,
            icon: Globe,
            hideInEmptyState: true,
            action: () => {
              onSetQuery(iface.domain);
              onClose();
            },
          });
        }
      }
    }

    // --- Dynamic: one per unique owner ---
    const seenOwners = new Set<string>();
    for (const service of services) {
      if (service.owner && !seenOwners.has(service.owner)) {
        seenOwners.add(service.owner);
        items.push({
          id: `owner-${service.owner}`,
          category: "navigate",
          label: service.owner,
          description: "Owner",
          icon: User,
          hideInEmptyState: true,
          action: () => {
            onSetOwner([service.owner]);
            onClose();
          },
        });
      }
    }

    // --- Export ---
    items.push({
      id: "export-csv",
      category: "export",
      label: "Export to CSV",
      icon: Download,
      action: () => {
        import("@/components/service-table/export").then(
          ({ exportServicesToCsv }) => {
            exportServicesToCsv(groupedServices);
          }
        );
        onClose();
      },
    });

    // --- Create actions (role-gated) ---
    if (canCreate) {
      items.push({
        id: "create-service",
        category: "actions",
        label: "Create Service",
        shortcutHint: "N S",
        icon: Plus,
        action: () => {
          onCreateService();
          onClose();
        },
      });

      items.push({
        id: "invite-member",
        category: "actions",
        label: "Invite Member",
        icon: UserPlus,
        url: `/organization/${slug}/invitations`,
        action: () => {
          router.push(`/organization/${slug}/invitations`);
          onClose();
        },
      });
    }

    return items;
  }, [props, router]);
}
