"use client";

import { Download, Search } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";

/**
 * Props for ServiceTableHeader component
 */
interface ServiceTableHeaderProps {
  readonly searchTerm: string;
  readonly onSearchChange: (value: string) => void;
  readonly onExportCsv: () => void;
  readonly servicesCount: number;
  readonly isLoading?: boolean;
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      searchInputRef.current?.focus();
    }

    if (e.key === "Escape") {
      searchInputRef.current?.blur();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  // Hide export when no services
  const showExport = servicesCount > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
          />
          <Input
            aria-label="Search services"
            className="h-9 border-black/10 pl-8 text-sm dark:border-white/5"
            disabled={isLoading}
            onChange={handleSearchChange}
            placeholder="Search services..."
            ref={searchInputRef}
            value={searchTerm}
          />
        </div>
        {showExport && (
          <button
            aria-label="Export to CSV"
            className="h-9 rounded border border-black/10 px-3 text-muted-foreground text-xs transition-colors hover:bg-muted/50 hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/5"
            disabled={isLoading}
            onClick={onExportCsv}
            type="button"
          >
            <Download className="mr-1.5 inline h-3.5 w-3.5" />
            CSV
          </button>
        )}
      </div>

      {servicesCount > 0 && (
        <div
          aria-atomic="true"
          aria-live="polite"
          className="text-[11px] text-muted-foreground/60"
        >
          {servicesCount} {servicesCount === 1 ? "service" : "services"}
        </div>
      )}
    </div>
  );
}
