"use client";

import { useCallback } from "react";
import { useSortParams } from "@/hooks/use-sort-params";

/**
 * Hook for managing sort query state
 * Provides the current sort state and a function to toggle sort direction
 */
export function useSortQuery() {
  const { params, setParams } = useSortParams();
  const [sortColumn, sortValue] = params.sort || [];

  /**
   * Toggle sort for a column
   * If clicking the same column: cycles through asc -> desc -> clear
   * If clicking a different column: sets new column to asc
   */
  const createSortQuery = useCallback(
    (name: string) => {
      const isSameColumn = sortColumn === name;
      if (isSameColumn && sortValue === "asc") {
        setParams({ sort: [name, "desc"] });
      } else if (isSameColumn && sortValue === "desc") {
        setParams({ sort: null });
      } else {
        setParams({ sort: [name, "asc"] });
      }
    },
    [sortColumn, sortValue, setParams]
  );

  return {
    /** Current sort column name */
    sortColumn,
    /** Current sort direction: "asc" | "desc" | undefined */
    sortValue,
    /** Function to toggle sort for a column */
    createSortQuery,
  };
}
