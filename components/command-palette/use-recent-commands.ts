import { useCallback, useEffect, useState } from "react";
import type { RecentCommand } from "./types";

const STORAGE_KEY = "cmd-palette-recent-v1";
const MAX_ENTRIES = 8;

function loadRecent(): RecentCommand[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as RecentCommand[];
  } catch {
    return [];
  }
}

function saveRecent(entries: RecentCommand[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function useRecentCommands() {
  const [recentIds, setRecentIds] = useState<RecentCommand[]>([]);

  useEffect(() => {
    setRecentIds(loadRecent());
  }, []);

  const push = useCallback(
    (id: string, label: string, category: string) => {
      const next = [
        { id, label, category, timestamp: Date.now() },
        ...recentIds.filter((r) => r.id !== id),
      ].slice(0, MAX_ENTRIES);
      setRecentIds(next);
      saveRecent(next);
    },
    [recentIds]
  );

  const clear = useCallback(() => {
    setRecentIds([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return { recentIds, push, clear };
}
