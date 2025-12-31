"use client"

import { memo, useState, useCallback } from "react"
import { Copy, ExternalLink, Terminal } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { EnvironmentInfo, GroupedService } from "./types"
import { ENV_LABELS, ENV_ORDER, RUNTIME_LABELS } from "./constants"

/**
 * Props for EnvBadges component
 */
interface EnvBadgesProps {
  readonly environments: readonly EnvironmentInfo[]
}

/**
 * Environment badges - displays unique environments with production indicator
 */
export const EnvBadges = memo(function EnvBadges({ environments }: EnvBadgesProps) {
  const uniqueEnvs = [...new Set(environments.map((e) => e.env))]
  const sortedEnvs = uniqueEnvs.sort((a, b) => ENV_ORDER.indexOf(a) - ENV_ORDER.indexOf(b))

  return (
    <div className="flex items-center gap-1.5 h-5">
      {sortedEnvs.length === 0 ? (
        <span className="text-[11px] font-mono text-muted-foreground/40">—</span>
      ) : (
        sortedEnvs.map((env) => (
          <div key={env} className="inline-flex items-center gap-1">
            {env === "production" && (
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" aria-label="Production" />
            )}
            <span className="text-[11px] font-mono text-muted-foreground/80 uppercase tracking-wide leading-none">
              {ENV_LABELS[env]}
            </span>
          </div>
        ))
      )}
    </div>
  )
})

/**
 * Props for DomainsAffordance component
 */
interface DomainsAffordanceProps {
  readonly environments: readonly EnvironmentInfo[]
  readonly domainsCount: number
}

/**
 * Domains affordance - clickable button with popover showing all domains
 */
export const DomainsAffordance = memo(function DomainsAffordance({
  environments,
  domainsCount,
}: DomainsAffordanceProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleCopyDomain = useCallback((domain: string) => {
    void navigator.clipboard.writeText(domain)
    setIsOpen(false)
  }, [])

  return (
    <div className="flex items-center h-5">
      {domainsCount === 0 ? (
        <span className="text-[11px] font-mono text-muted-foreground/40">—</span>
      ) : (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground hover:underline underline-offset-2 decoration-muted-foreground/30 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm leading-none"
              onClick={(e) => e.stopPropagation()}
            >
              {domainsCount} {domainsCount === 1 ? "domain" : "domains"}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-96 p-3 dark:border-white/10 border-black/10 shadow-lg"
            side="bottom"
            align="start"
            sideOffset={4}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <div className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wide mb-2 px-1">
                Domains ({environments.length})
              </div>
              {environments.length === 0 ? (
                <div className="text-[11px] text-muted-foreground/60 py-2 px-1">No domains configured</div>
              ) : (
                environments.map((env, idx) => (
                  <div
                    key={`${env.domain}-${env.env}-${idx}`}
                    className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group/item"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1.5 shrink-0">
                        {env.env === "production" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" aria-label="Production" />
                        )}
                        <span className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wide min-w-12">
                          {ENV_LABELS[env.env]}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[11px] font-mono text-foreground truncate font-medium">
                          {env.domain}
                        </span>
                        {env.branch && (
                          <span className="text-[10px] font-mono text-muted-foreground/50 truncate">
                            branch: {env.branch}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyDomain(env.domain)}
                      className="p-1.5 hover:bg-muted rounded transition-colors shrink-0 opacity-0 group-hover/item:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label={`Copy ${env.domain}`}
                      title="Copy domain"
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
  )
})

/**
 * Props for RuntimeFootprint component
 */
interface RuntimeFootprintProps {
  readonly runtimeFootprint: readonly string[]
}

/**
 * Runtime footprint - displays aggregated runtime types
 */
export const RuntimeFootprint = memo(function RuntimeFootprint({ runtimeFootprint }: RuntimeFootprintProps) {
  const display =
    runtimeFootprint.length > 0
      ? runtimeFootprint.map((rt) => RUNTIME_LABELS[rt] ?? rt.toUpperCase()).join("·")
      : null

  return (
    <div className="flex items-center h-5">
      {display ? (
        <span className="text-[11px] font-mono text-muted-foreground/70 leading-none">{display}</span>
      ) : (
        <span className="text-[11px] font-mono text-muted-foreground/40">—</span>
      )}
    </div>
  )
})

/**
 * Props for RowActions component
 */
interface RowActionsProps {
  readonly service: GroupedService
}

/**
 * Row actions - always present, opacity changes on hover
 */
export const RowActions = memo(function RowActions({ service }: RowActionsProps) {
  const handleCopyPrimaryDomain = useCallback(() => {
    const primaryEnv = service.environments.find((e) => e.env === "production") ?? service.environments[0]
    if (primaryEnv) {
      void navigator.clipboard.writeText(primaryEnv.domain)
    }
  }, [service.environments])

  const handleOpenRepository = useCallback(() => {
    if (service.repository) {
      window.open(service.repository, "_blank", "noopener,noreferrer")
    }
  }, [service.repository])

  const handleRuntimeAction = useCallback(() => {
    const runtimeEnv = service.environments.find((e) => e.runtimeType && e.runtimeId)
    if (!runtimeEnv?.runtimeId) {
      return
    }

    if (runtimeEnv.runtimeType === "ec2" && runtimeEnv.runtimeId.startsWith("i-")) {
      const url = `https://console.aws.amazon.com/systems-manager/session-manager/${runtimeEnv.runtimeId}`
      window.open(url, "_blank", "noopener,noreferrer")
    } else if (runtimeEnv.runtimeType === "k8s" && runtimeEnv.runtimeId.includes("/")) {
      const [cluster, namespace] = runtimeEnv.runtimeId.split("/")
      const hint = `kubectl --context ${cluster} -n ${namespace} get pods`
      void navigator.clipboard.writeText(hint)
    }
  }, [service.environments])

  const hasRuntimeAction = service.environments.some(
    (e) =>
      e.runtimeType &&
      e.runtimeId &&
      ((e.runtimeType === "ec2" && e.runtimeId.startsWith("i-")) ||
        (e.runtimeType === "k8s" && e.runtimeId.includes("/"))),
  )

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center justify-end gap-0.5 h-5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
        {service.repository && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenRepository()
                }}
                className="p-1 rounded transition-colors hover:bg-muted/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="View repository"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              View
            </TooltipContent>
          </Tooltip>
        )}
        {service.domainsCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyPrimaryDomain()
                }}
                className="p-1 rounded transition-colors hover:bg-muted/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Copy primary domain"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Copy
            </TooltipContent>
          </Tooltip>
        )}
        {hasRuntimeAction && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRuntimeAction()
                }}
                className="p-1 rounded transition-colors hover:bg-muted/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Open runtime"
              >
                <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Runtime
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
})

