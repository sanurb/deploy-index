"use client"

import { useMemo } from "react"
import { parseYaml } from "@/lib/yaml-utils"
import { groupServicesByService, calculateSearchScore } from "./utils"
import type { GroupedService } from "./types"

/**
 * Hook to parse and filter service data
 */
export function useServiceData(yamlContent: string, searchTerm: string): {
  readonly services: readonly GroupedService[]
  readonly filteredServices: readonly GroupedService[]
} {
  const groupedServices = useMemo(() => {
    try {
      const parsed = parseYaml(yamlContent)
      return groupServicesByService(parsed.services)
    } catch {
      return []
    }
  }, [yamlContent])

  const filteredServices = useMemo((): GroupedService[] => {
    if (!searchTerm.trim()) {
      return [...groupedServices]
    }

    return groupedServices
      .map((service) => ({ service, score: calculateSearchScore(service, searchTerm) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ service }) => service)
  }, [groupedServices, searchTerm])

  return {
    services: groupedServices,
    filteredServices,
  }
}

