import { CommandItem, CommandShortcut } from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import type { CommandAction } from "./types";

interface PaletteItemProps {
  readonly item: CommandAction;
  readonly onSelect: () => void;
}

export function PaletteItem({ item, onSelect }: PaletteItemProps) {
  const Icon = item.icon;

  return (
    <CommandItem
      className="cursor-pointer"
      data-item-id={item.id}
      onSelect={onSelect}
      value={`${item.label} ${item.description ?? ""}`}
    >
      <div className="flex size-6 shrink-0 items-center justify-center rounded border border-border">
        <Icon className="size-3.5" />
      </div>
      <div className="flex-1 truncate">
        <span>{item.label}</span>
        {item.description && (
          <span className="ml-2 text-muted-foreground text-xs">
            {item.description}
          </span>
        )}
      </div>
      {item.shortcutHint && (
        <CommandShortcut>
          {item.shortcutHint.split(" ").map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
        </CommandShortcut>
      )}
    </CommandItem>
  );
}
