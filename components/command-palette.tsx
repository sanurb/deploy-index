"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { PaletteItem } from "./command-palette/palette-item";
import type { CommandPaletteProps } from "./command-palette/types";
import { useCommandItems } from "./command-palette/use-command-items";
import { useRecentCommands } from "./command-palette/use-recent-commands";

const SUGGESTED_IDS = [
  "nav-services",
  "nav-members",
  "export-csv",
  "create-service",
];

export type { CommandPaletteProps };

export function CommandPalette(props: CommandPaletteProps) {
  const { open, onOpenChange } = props;
  const [query, setQuery] = useState("");
  const { recentIds, push } = useRecentCommands();

  const onClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  const items = useCommandItems({ ...props, onClose });

  const itemMap = useMemo(() => {
    const map = new Map<string, (typeof items)[number]>();
    for (const item of items) {
      map.set(item.id, item);
    }
    return map;
  }, [items]);

  // Reset query when closing
  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  // Cmd+Enter: open selected item in new tab
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        const selected = document.querySelector(
          "[cmdk-item][data-selected='true']"
        );
        if (!selected) return;
        const itemId = selected.getAttribute("data-item-id");
        if (!itemId) return;
        const item = itemMap.get(itemId);
        if (item?.url) {
          e.preventDefault();
          window.open(item.url, "_blank", "noopener,noreferrer");
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, itemMap]);

  const handleSelect = useCallback(
    (item: (typeof items)[number]) => {
      push(item.id, item.label, item.category);
      item.action();
    },
    [push]
  );

  const isEmpty = query === "";

  // Empty state groups
  const recentItems = useMemo(() => {
    if (!isEmpty) return [];
    return recentIds
      .map((r) => itemMap.get(r.id))
      .filter((item): item is NonNullable<typeof item> => item != null);
  }, [isEmpty, recentIds, itemMap]);

  const suggestedItems = useMemo(() => {
    if (!isEmpty) return [];
    return SUGGESTED_IDS.map((id) => itemMap.get(id)).filter(
      (item): item is NonNullable<typeof item> => item != null
    );
  }, [isEmpty, itemMap]);

  // Query state groups
  const navigateItems = useMemo(
    () => items.filter((i) => i.category === "navigate"),
    [items]
  );
  const exportItems = useMemo(
    () => items.filter((i) => i.category === "export"),
    [items]
  );
  const actionItems = useMemo(
    () => items.filter((i) => i.category === "actions"),
    [items]
  );

  return (
    <CommandDialog
      onOpenChange={onOpenChange}
      open={open}
      showCloseButton={false}
    >
      <CommandInput
        onValueChange={setQuery}
        placeholder="Type a command or search…"
        value={query}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {isEmpty ? (
          <>
            {recentItems.length > 0 && (
              <CommandGroup heading="Recent">
                {recentItems.map((item) => (
                  <PaletteItem
                    item={item}
                    key={item.id}
                    onSelect={() => handleSelect(item)}
                  />
                ))}
              </CommandGroup>
            )}
            {suggestedItems.length > 0 && (
              <CommandGroup heading="Suggested">
                {suggestedItems.map((item) => (
                  <PaletteItem
                    item={item}
                    key={item.id}
                    onSelect={() => handleSelect(item)}
                  />
                ))}
              </CommandGroup>
            )}
          </>
        ) : (
          <>
            {navigateItems.length > 0 && (
              <CommandGroup heading="Navigate">
                {navigateItems.map((item) => (
                  <PaletteItem
                    item={item}
                    key={item.id}
                    onSelect={() => handleSelect(item)}
                  />
                ))}
              </CommandGroup>
            )}
            {exportItems.length > 0 && (
              <CommandGroup heading="Export">
                {exportItems.map((item) => (
                  <PaletteItem
                    item={item}
                    key={item.id}
                    onSelect={() => handleSelect(item)}
                  />
                ))}
              </CommandGroup>
            )}
            {actionItems.length > 0 && (
              <CommandGroup heading="Actions">
                {actionItems.map((item) => (
                  <PaletteItem
                    item={item}
                    key={item.id}
                    onSelect={() => handleSelect(item)}
                  />
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>

      {/* Footer keyboard hints */}
      <CommandSeparator />
      <div className="flex items-center gap-3 px-3 py-2 text-muted-foreground text-xs">
        <span className="flex items-center gap-1">
          <KbdGroup>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
          </KbdGroup>
          <span>navigate</span>
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd>
          <span>run</span>
        </span>
        <span className="flex items-center gap-1">
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd>
          </KbdGroup>
          <span>new tab</span>
        </span>
        <span className="flex items-center gap-1">
          <Kbd>Esc</Kbd>
          <span>close</span>
        </span>
      </div>
    </CommandDialog>
  );
}
