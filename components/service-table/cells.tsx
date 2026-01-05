"use client";

import { Copy, ExternalLink, Terminal } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { Pill, PillIndicator } from "@/components/kibo-ui/pill";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
                      void navigator.clipboard.writeText(env.domain);
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
    void navigator.clipboard.writeText(domain);
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
                            aria-label="Production"
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500"
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
                      aria-label={`Copy ${env.domain}`}
                      className="shrink-0 rounded p-1.5 opacity-0 transition-colors hover:bg-muted focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/item:opacity-100"
                      onClick={() => handleCopyDomain(env.domain)}
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
}

/**
 * Row actions - always present, opacity changes on hover
 */
export const RowActions = memo(function RowActions({
  service,
}: RowActionsProps) {
  const handleCopyPrimaryDomain = useCallback(() => {
    const primaryEnv =
      service.environments.find((e) => e.env === "production") ??
      service.environments[0];
    if (primaryEnv) {
      void navigator.clipboard.writeText(primaryEnv.domain);
    }
  }, [service.environments]);

  const handleOpenRepository = useCallback(() => {
    if (service.repository) {
      window.open(service.repository, "_blank", "noopener,noreferrer");
    }
  }, [service.repository]);

  const handleRuntimeAction = useCallback(() => {
    const runtimeEnv = service.environments.find(
      (e) => e.runtimeType && e.runtimeId
    );
    if (!runtimeEnv?.runtimeId) {
      return;
    }

    if (
      runtimeEnv.runtimeType === "ec2" &&
      runtimeEnv.runtimeId.startsWith("i-")
    ) {
      const url = `https://console.aws.amazon.com/systems-manager/session-manager/${runtimeEnv.runtimeId}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (
      runtimeEnv.runtimeType === "k8s" &&
      runtimeEnv.runtimeId.includes("/")
    ) {
      const [cluster, namespace] = runtimeEnv.runtimeId.split("/");
      const hint = `kubectl --context ${cluster} -n ${namespace} get pods`;
      void navigator.clipboard.writeText(hint);
    }
  }, [service.environments]);

  const hasRuntimeAction = service.environments.some(
    (e) =>
      e.runtimeType &&
      e.runtimeId &&
      ((e.runtimeType === "ec2" && e.runtimeId.startsWith("i-")) ||
        (e.runtimeType === "k8s" && e.runtimeId.includes("/")))
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-5 items-center justify-end gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
        {service.repository && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label="View repository"
                className="rounded p-1 transition-colors hover:bg-muted/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenRepository();
                }}
                type="button"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs" side="top">
              View
            </TooltipContent>
          </Tooltip>
        )}
        {service.domainsCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label="Copy primary domain"
                className="rounded p-1 transition-colors hover:bg-muted/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyPrimaryDomain();
                }}
                type="button"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs" side="top">
              Copy
            </TooltipContent>
          </Tooltip>
        )}
        {hasRuntimeAction && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label="Open runtime"
                className="rounded p-1 transition-colors hover:bg-muted/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRuntimeAction();
                }}
                type="button"
              >
                <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs" side="top">
              Runtime
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
});
