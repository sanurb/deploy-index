"use client"

import { useRef, useEffect, useCallback } from "react"
import { Search, Download } from "lucide-react"

import { Input } from "@/components/ui/input"
import type { GroupedService } from "./types"

/**
 * Props for ServiceTableHeader component
 */
interface ServiceTableHeaderProps {
  readonly searchTerm: string
  readonly onSearchChange: (value: string) => void
  readonly onExportCsv: () => void
  readonly servicesCount: number
  readonly isLoading?: boolean
}

/**
 * Service table header with search and export actions
 */
export function ServiceTableHeader({
  searchTerm,
  onSearchChange,
  onExportCsv,
  servicesCount,
  isLoading = false,
}: ServiceTableHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault()
      searchInputRef.current?.focus()
    }

    if (e.key === "Escape") {
      searchInputRef.current?.blur()
    }
  }, [])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value)
    },
    [onSearchChange],
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50"
            aria-hidden="true"
          />
          <Input
            ref={searchInputRef}
            placeholder="Search... (Press / to focus)"
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-8 h-9 text-sm dark:border-white/5 border-black/10"
            aria-label="Search services"
            disabled={isLoading}
          />
        </div>
        <button
          type="button"
          onClick={onExportCsv}
          disabled={isLoading}
          className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-white/5 border-black/10 border disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Export to CSV"
        >
          <Download className="h-3.5 w-3.5 inline mr-1.5" />
          CSV
        </button>
      </div>

      <div className="text-[11px] text-muted-foreground/60" aria-live="polite" aria-atomic="true">
        {servicesCount} {servicesCount === 1 ? "service" : "services"}
      </div>
    </div>
  )
}

