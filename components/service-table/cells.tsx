"use client";

import { Copy } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Pill, PillIndicator } from "@/components/kibo-ui/pill";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ENV_LABELS, ENV_ORDER, RUNTIME_LABELS } from "./constants";
import type { EnvironmentInfo, GroupedService } from "./types";

/**
 * Props for EnvBadges component
 */
interface EnvBadgesProps {
  readonly environments: readonly EnvironmentInfo[];
}

/**
 * Environment cell - single aggregated state indicator using Pill component
 * Displays one primary environment label with +N counter for additional environments
 * Popover on hover/focus shows all environments ordered PROD → STAGE → DEV
 */
export const EnvBadges = memo(function EnvBadges({
  environments,
}: EnvBadgesProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { sortedEnvs, primaryEnv, additionalCount, hasProduction } =
    useMemo(() => {
      const uniqueEnvs = [...new Set(environments.map((e) => e.env))];
      const sortedEnvs = uniqueEnvs.sort(
        (a, b) => ENV_ORDER.indexOf(a) - ENV_ORDER.indexOf(b)
      );
      const hasProduction = sortedEnvs.includes("production");
      const primaryEnv = sortedEnvs[0] ?? null;
      const additionalCount = sortedEnvs.length > 1 ? sortedEnvs.length - 1 : 0;

      return { sortedEnvs, primaryEnv, additionalCount, hasProduction };
    }, [environments]);

  const sortedEnvironmentsForPopover = useMemo(() => {
    return [...environments].sort((a, b) => {
      const aIndex = ENV_ORDER.indexOf(a.env);
      const bIndex = ENV_ORDER.indexOf(b.env);
      return aIndex - bIndex;
    });
  }, [environments]);

  if (sortedEnvs.length === 0) {
    return (
      <div className="flex h-5 items-center">
        <span className="font-mono text-[11px] text-muted-foreground/40">
          —
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-5 items-center">
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center rounded-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={(e) => e.stopPropagation()}
            type="button"
          >
            <Pill
              className="flex h-5 min-w-[60px] max-w-[120px] shrink-0 cursor-pointer items-center gap-1.5 px-2 py-0 transition-colors hover:bg-muted/50"
              variant="secondary"
            >
              {hasProduction && (
                <PillIndicator pulse={false} variant="success" />
              )}
              <span className="font-mono text-[11px] text-muted-foreground/80 uppercase leading-none tracking-wide">
                {primaryEnv ? ENV_LABELS[primaryEnv] : "—"}
              </span>
              {additionalCount > 0 && (
                <span className="font-mono text-[11px] text-muted-foreground/40 leading-none">
                  +{additionalCount}
                </span>
              )}
            </Pill>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-96 border-black/10 p-3 shadow-lg dark:border-white/10"
          onClick={(e) => e.stopPropagation()}
          side="bottom"
          sideOffset={4}
        >
          <div className="space-y-1.5">
            <div className="mb-2 px-1 font-medium text-[10px] text-muted-foreground/70 uppercase tracking-wide">
              Environments ({sortedEnvironmentsForPopover.length})
            </div>
            {sortedEnvironmentsForPopover.length === 0 ? (
              <div className="px-1 py-2 text-[11px] text-muted-foreground/60">
                No environments configured
              </div>
            ) : (
              sortedEnvironmentsForPopover.map((env, idx) => (
                <div
                  className="group/item flex items-center justify-between gap-2 rounded-md p-2 transition-colors hover:bg-muted/50"
                  key={`${env.domain}-${env.env}-${idx}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className="inline-flex shrink-0 items-center gap-1.5">
                      {env.env === "production" && (
                        <PillIndicator pulse={false} variant="success" />
                      )}
                      <span className="min-w-12 font-mono text-[10px] text-muted-foreground/70 uppercase tracking-wide">
                        {ENV_LABELS[env.env]}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium font-mono text-[11px] text-foreground">
                        {env.domain}
                      </span>
                      {env.branch && (
                        <span className="truncate font-mono text-[10px] text-muted-foreground/50">
                          branch: {env.branch}
                        </span>
                      )}
                      {env.runtimeType && env.runtimeId && (
                        <span className="truncate font-mono text-[10px] text-muted-foreground/50">
                          {env.runtimeType}: {env.runtimeId}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    aria-label={`Copy ${env.domain}`}
                    className="shrink-0 rounded p-1.5 opacity-0 transition-colors hover:bg-muted focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/item:opacity-100"
                    onClick={() => {
                      navigator.clipboard.writeText(env.domain).catch(() => {
                        // Ignore clipboard errors
                      });
                      setIsOpen(false);
                    }}
                    title="Copy domain"
                    type="button"
                  >
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});

/**
 * Props for DomainsAffordance component
 */
interface DomainsAffordanceProps {
  readonly environments: readonly EnvironmentInfo[];
  readonly domainsCount: number;
}

/**
 * Domains affordance - clickable button with popover showing all domains
 */
export const DomainsAffordance = memo(function DomainsAffordance({
  environments,
  domainsCount,
}: DomainsAffordanceProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCopyDomain = useCallback((domain: string) => {
    navigator.clipboard.writeText(domain).catch(() => {
      // Ignore clipboard errors
    });
    setIsOpen(false);
  }, []);

  return (
    <div className="flex h-5 items-center">
      {domainsCount === 0 ? (
        <span className="font-mono text-[11px] text-muted-foreground/40">
          —
        </span>
      ) : (
        <Popover onOpenChange={setIsOpen} open={isOpen}>
          <PopoverTrigger asChild>
            <button
              className="rounded-sm font-mono text-[11px] text-muted-foreground leading-none decoration-muted-foreground/30 underline-offset-2 transition-colors hover:text-foreground hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={(e) => e.stopPropagation()}
              type="button"
            >
              {domainsCount} {domainsCount === 1 ? "domain" : "domains"}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-96 border-black/10 p-3 shadow-lg dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
            side="bottom"
            sideOffset={4}
          >
            <div className="space-y-1.5">
              <div className="mb-2 px-1 font-medium text-[10px] text-muted-foreground/70 uppercase tracking-wide">
                Domains ({environments.length})
              </div>
              {environments.length === 0 ? (
                <div className="px-1 py-2 text-[11px] text-muted-foreground/60">
                  No domains configured
                </div>
              ) : (
                environments.map((env, idx) => (
                  <div
                    className="group/item flex items-center justify-between gap-2 rounded-md p-2 transition-colors hover:bg-muted/50"
                    key={`${env.domain}-${env.env}-${idx}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div className="inline-flex shrink-0 items-center gap-1.5">
                        {env.env === "production" && (
                          <div
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500"
                            title="Production"
                          />
                        )}
                        <span className="min-w-12 font-mono text-[10px] text-muted-foreground/70 uppercase tracking-wide">
                          {ENV_LABELS[env.env]}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium font-mono text-[11px] text-foreground">
                          {env.domain}
                        </span>
                        {env.branch && (
                          <span className="truncate font-mono text-[10px] text-muted-foreground/50">
                            branch: {env.branch}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="shrink-0 rounded p-1.5 opacity-0 transition-colors hover:bg-muted focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/item:opacity-100"
                      onClick={() => handleCopyDomain(env.domain)}
                      title={`Copy ${env.domain}`}
                      type="button"
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
});

/**
 * Props for RuntimeFootprint component
 */
interface RuntimeFootprintProps {
  readonly runtimeFootprint: readonly string[];
}

/**
 * Runtime footprint - displays aggregated runtime types
 */
export const RuntimeFootprint = memo(function RuntimeFootprint({
  runtimeFootprint,
}: RuntimeFootprintProps) {
  const display =
    runtimeFootprint.length > 0
      ? runtimeFootprint
          .map((rt) => RUNTIME_LABELS[rt] ?? rt.toUpperCase())
          .join("·")
      : null;

  return (
    <div className="flex h-5 items-center">
      {display ? (
        <span className="font-mono text-[11px] text-muted-foreground/70 leading-none">
          {display}
        </span>
      ) : (
        <span className="font-mono text-[11px] text-muted-foreground/40">
          —
        </span>
      )}
    </div>
  );
});

/**
 * Props for RowActions component
 */
interface RowActionsProps {
  readonly service: GroupedService;
  readonly onEdit: (service: GroupedService) => void;
  readonly onDelete: (service: GroupedService) => void;
}

/**
 * Row actions - three-dot menu with Edit and Delete options
 */
export const RowActions = memo(function RowActions({
  service,
  onEdit,
  onDelete,
}: RowActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleEdit = useCallback(() => {
    // Close dropdown first, then open drawer
    setIsDropdownOpen(false);
    // Use setTimeout to ensure dropdown closes before drawer opens
    // This prevents focus issues and ensures proper focus restoration
    setTimeout(() => {
      onEdit(service);
      // The page component will handle focus restoration when drawer closes
    }, 0);
  }, [onEdit, service]);

  const handleDeleteClick = useCallback(() => {
    setIsDropdownOpen(false);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setIsDeleteDialogOpen(false);
    onDelete(service);
  }, [onDelete, service]);

  return (
    <div className="flex h-5 items-center justify-end">
      <DropdownMenu onOpenChange={setIsDropdownOpen} open={isDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Service actions"
            className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={(e) => e.stopPropagation()}
            ref={triggerRef}
            type="button"
          >
            <span className="text-lg text-muted-foreground leading-none">
              ⋯
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <DropdownMenuItem onClick={handleEdit}>Edit service</DropdownMenuItem>
          <DropdownMenuItem onClick={handleDeleteClick} variant="destructive">
            Delete service
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
      >
        <AlertDialogContent
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{service.name}"? This action
              cannot be undone and will remove all associated interfaces and
              dependencies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
