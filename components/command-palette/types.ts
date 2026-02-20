import type { LucideIcon } from "lucide-react";
import type { GroupedService } from "@/components/service-table/types";

export interface CommandAction {
  readonly id: string;
  readonly category: "navigate" | "export" | "actions";
  readonly label: string;
  readonly description?: string;
  readonly icon: LucideIcon;
  readonly shortcutHint?: string;
  readonly url?: string;
  readonly action: () => void;
  readonly hideInEmptyState?: boolean;
}

export interface RawPaletteService {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly interfaces?: ReadonlyArray<{
    readonly domain: string;
  }>;
}

export interface RecentCommand {
  readonly id: string;
  readonly label: string;
  readonly category: string;
  readonly timestamp: number;
}

export interface CommandPaletteProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly slug: string;
  readonly services: readonly RawPaletteService[];
  readonly canCreate: boolean;
  readonly onCreateService: () => void;
  readonly onSetQuery: (query: string) => void;
  readonly onSetOwner: (owner: readonly string[]) => void;
  readonly groupedServices: readonly GroupedService[];
}
