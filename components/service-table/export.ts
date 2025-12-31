import type { GroupedService } from "./types"
import { ENV_LABELS } from "./constants"

/**
 * Exports services data to CSV format
 */
export function exportServicesToCsv(services: readonly GroupedService[]): void {
  const csvRows: string[][] = []

  for (const service of services) {
    if (service.environments.length === 0) {
      csvRows.push([service.name, service.owner, service.repository, "—", "—", "—", "—", "—"])
    } else {
      for (const env of service.environments) {
        csvRows.push([
          service.name,
          service.owner,
          service.repository,
          env.domain,
          ENV_LABELS[env.env],
          env.branch ?? "—",
          env.runtimeType ?? "—",
          env.runtimeId ?? "—",
        ])
      }
    }
  }

  const csvContent = [
    ["Service", "Owner", "Repository", "Domain", "Environment", "Branch", "Runtime Type", "Runtime ID"].join(","),
    ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "services-export.csv"
  anchor.click()
  URL.revokeObjectURL(url)
}

