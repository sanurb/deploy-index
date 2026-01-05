"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DraggableHeaderProps {
  id: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
}

export function DraggableHeader({
  id,
  children,
  className,
  style,
  disabled = false,
}: DraggableHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
  });

  const dragStyle: CSSProperties = {
    // Use Translate instead of Transform to avoid scaling content
    transform: CSS.Translate.toString(transform),
    transition,
    ...style,
  };

  return (
    <TableHead
      className={cn(
        "group/header relative flex h-full select-none items-center border-border border-t px-4",
        "shadow-none outline-none ring-0 hover:shadow-none focus:shadow-none focus:outline-none focus:ring-0",
        isDragging && "z-50 border border-border bg-background",
        className
      )}
      ref={setNodeRef}
      style={dragStyle}
    >
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      {!disabled && (
        <GripVertical
          className="ml-1 shrink-0 cursor-grab text-muted-foreground opacity-0 active:cursor-grabbing group-hover/header:opacity-100"
          size={14}
          {...attributes}
          {...listeners}
        />
      )}
    </TableHead>
  );
}
