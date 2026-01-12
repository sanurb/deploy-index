"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Portal } from "@/components/portal";
import { Button } from "@/components/ui/button";

interface BottomBarProps {
  /** Number of selected items */
  selectedCount: number;
  /** Callback to deselect all items */
  onDeselect: () => void;
  /** Action buttons to render on the right side */
  children: ReactNode;
}

/**
 * Generic bottom bar for table multi-select actions
 * Appears at the bottom of the screen when items are selected
 */
export function BottomBar({
  selectedCount,
  onDeselect,
  children,
}: BottomBarProps) {
  return (
    <Portal>
      <motion.div
        animate={{ y: 0 }}
        className="pointer-events-none fixed right-0 bottom-6 left-0 z-50 flex h-12 justify-center"
        exit={{ y: 100 }}
        initial={{ y: 100 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="pointer-events-auto relative h-12 min-w-[400px]">
          {/* Blur layer fades in separately to avoid backdrop-filter animation issues */}
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[rgba(247,247,247,0.85)] backdrop-blur-lg backdrop-filter dark:bg-[rgba(19,19,19,0.7)]"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <div className="relative flex h-12 items-center justify-between pr-2 pl-4">
            <span className="text-sm">{selectedCount} selected</span>

            <div className="flex items-center space-x-2">
              <Button
                className="text-muted-foreground"
                onClick={onDeselect}
                variant="ghost"
              >
                <span>Deselect all</span>
              </Button>

              {children}
            </div>
          </div>
        </div>
      </motion.div>
    </Portal>
  );
}
