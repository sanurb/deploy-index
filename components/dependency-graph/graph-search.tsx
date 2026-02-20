"use client";

import { Command } from "cmdk";
import { GitBranch, Globe, Package, Search } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { db } from "@/lib/db";
import type { FocusKind, FocusRef } from "@/types/graph";

interface GraphSearchProps {
  readonly organizationId: string;
  readonly onSelect: (ref: FocusRef) => void;
  readonly onFocusChange?: (focused: boolean) => void;
}

export interface GraphSearchHandle {
  focus: () => void;
  blur: () => void;
}

const KIND_ICONS: Record<FocusKind, typeof Package> = {
  service: Package,
  domain: Globe,
  dependency: GitBranch,
};

export const GraphSearch = forwardRef<GraphSearchHandle, GraphSearchProps>(
  function GraphSearch({ organizationId, onSelect, onFocusChange }, ref) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus() {
        inputRef.current?.focus();
      },
      blur() {
        inputRef.current?.blur();
      },
    }));

    // Query services with interfaces and dependencies for suggestions
    const { data } = db.useQuery(
      organizationId
        ? {
            services: {
              $: { where: { organizationId } },
              interfaces: {},
              dependencies: {},
            },
          }
        : null
    );

    const suggestions = useMemo(() => {
      if (!data?.services) return [];

      const items: FocusRef[] = [];
      const seen = new Set<string>();

      for (const svc of data.services) {
        // Service
        const svcKey = `service:${svc.id}`;
        if (!seen.has(svcKey)) {
          seen.add(svcKey);
          items.push({
            kind: "service",
            id: svc.id,
            displayName: svc.name,
          });
        }

        // Domains
        const interfaces = (svc.interfaces ?? []) as Array<{
          domain: string;
        }>;
        for (const iface of interfaces) {
          if (!iface.domain) continue;
          const domKey = `domain:${iface.domain}`;
          if (!seen.has(domKey)) {
            seen.add(domKey);
            items.push({
              kind: "domain",
              id: iface.domain,
              displayName: iface.domain,
            });
          }
        }

        // Dependencies
        const deps = (svc.dependencies ?? []) as Array<{
          dependencyName: string;
        }>;
        for (const dep of deps) {
          const depKey = `dependency:${dep.dependencyName}`;
          if (!seen.has(depKey)) {
            seen.add(depKey);
            items.push({
              kind: "dependency",
              id: dep.dependencyName,
              displayName: dep.dependencyName,
            });
          }
        }
      }

      return items;
    }, [data?.services]);

    const filtered = useMemo(() => {
      if (!query.trim()) return suggestions.slice(0, 20);
      const q = query.toLowerCase();
      return suggestions
        .filter((s) => s.displayName.toLowerCase().includes(q))
        .slice(0, 20);
    }, [suggestions, query]);

    const handleSelect = useCallback(
      (value: string) => {
        // value format: "kind:id"
        const colonIdx = value.indexOf(":");
        if (colonIdx === -1) return;
        const kind = value.slice(0, colonIdx) as FocusKind;
        const id = value.slice(colonIdx + 1);
        const item = suggestions.find((s) => s.kind === kind && s.id === id);
        if (item) {
          onSelect(item);
          setQuery(item.displayName);
          setOpen(false);
          inputRef.current?.blur();
        }
      },
      [suggestions, onSelect]
    );

    const handleFocus = useCallback(() => {
      setOpen(true);
      onFocusChange?.(true);
    }, [onFocusChange]);

    const handleBlur = useCallback(() => {
      // Delay to allow click on suggestion
      setTimeout(() => {
        setOpen(false);
        onFocusChange?.(false);
      }, 150);
    }, [onFocusChange]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
          if (query) {
            setQuery("");
          } else {
            inputRef.current?.blur();
            setOpen(false);
          }
        }
      },
      [query]
    );

    return (
      <div className="relative w-full max-w-md">
        <Command
          className="rounded-lg border border-slate-700 bg-slate-900"
          shouldFilter={false}
        >
          <div className="flex items-center gap-2 px-3">
            <Search className="size-4 text-slate-400" />
            <Command.Input
              className="h-9 w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
              onBlur={handleBlur}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              onValueChange={setQuery}
              placeholder="Search by service, domain, or dependency..."
              ref={inputRef}
              value={query}
            />
          </div>

          {open && filtered.length > 0 && (
            <Command.List className="max-h-60 overflow-y-auto border-t border-slate-800 p-1">
              {filtered.map((item) => {
                const Icon = KIND_ICONS[item.kind];
                const value = `${item.kind}:${item.id}`;

                return (
                  <Command.Item
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-300 data-[selected=true]:bg-slate-800 data-[selected=true]:text-slate-100"
                    key={value}
                    onSelect={() => handleSelect(value)}
                    value={value}
                  >
                    <Icon className="size-3.5 text-slate-500" />
                    <span className="flex-1 truncate">{item.displayName}</span>
                    <span className="text-xs capitalize text-slate-600">
                      {item.kind}
                    </span>
                  </Command.Item>
                );
              })}
            </Command.List>
          )}
        </Command>
      </div>
    );
  }
);
