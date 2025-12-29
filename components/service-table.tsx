"use client"

import { Fragment, useState, useMemo, useEffect, useCallback } from "react"
import { ChevronDown, ChevronRight, Copy, Download, ExternalLink, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { parseYaml, type ParsedYaml, type Service, type ServiceInterface } from "@/lib/yaml-utils"

interface ServiceTableProps {
  readonly yamlContent: string
  readonly initialSearchQuery: string | undefined
}


interface FlatServiceRow {
  readonly serviceIndex: number
  readonly serviceName: string
  readonly owner: string
  readonly repository: string
  readonly dependencies: readonly string[]
  readonly domain: string | null
  readonly env: string | null
  readonly branch: string | null
}

interface ScoredRow extends FlatServiceRow {
  readonly score: number
}

type Environment = "production" | "staging" | "development"

const SEARCH_SCORE_WEIGHTS = {
  DOMAIN_EXACT: 150,
  DOMAIN_PARTIAL: 100,
  SERVICE_NAME: 50,
  BRANCH: 30,
  OWNER: 20,
  ENV: 10,
} as const

const INTERFACE_INDEX_MULTIPLIER = 1000

const CSV_HEADERS = ["Domain", "Service", "Environment", "Branch", "Owner", "Repository"] as const

const ENV_COLOR_MAP = {
  production: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400",
  staging: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
  development: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400",
} as const

const DEFAULT_ENV_COLOR = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"

const getEnvColor = (env: string | null): string => {
  if (!env) {
    return DEFAULT_ENV_COLOR
  }

  const normalizedEnv = env.toLowerCase() as Environment
  return ENV_COLOR_MAP[normalizedEnv] ?? DEFAULT_ENV_COLOR
}

export function ServiceTable({ yamlContent, initialSearchQuery = "" }: ServiceTableProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  useEffect(() => {
    setSearchTerm(initialSearchQuery)
  }, [initialSearchQuery])

  const flatData = useMemo((): readonly FlatServiceRow[] => {
    try {
      const parsed = parseYaml(yamlContent)
      const services = parsed.services

      return services.flatMap((service: Service, serviceIndex: number): readonly FlatServiceRow[] => {
        const baseRow: Omit<FlatServiceRow, "serviceIndex" | "domain" | "env" | "branch"> = {
          serviceName: service.name,
          owner: service.owner,
          repository: service.repository,
          dependencies: service.dependencies ?? [],
        }

        if (!service.interfaces || service.interfaces.length === 0) {
          return [
            {
              ...baseRow,
              serviceIndex,
              domain: null,
              env: null,
              branch: null,
            },
          ]
        }

        return service.interfaces.map(
          (iface: ServiceInterface, ifaceIndex: number): FlatServiceRow => ({
            ...baseRow,
            serviceIndex: serviceIndex * INTERFACE_INDEX_MULTIPLIER + ifaceIndex,
            domain: iface.domain,
            env: iface.env ?? null,
            branch: iface.branch ?? null,
          }),
        )
      })
    } catch {
      return []
    }
  }, [yamlContent])

  const filteredData = useMemo((): readonly ScoredRow[] => {
    if (!searchTerm.trim()) {
      return flatData.map((row) => ({ ...row, score: 0 }))
    }

    const query = searchTerm.toLowerCase()

    return flatData
      .map((row): ScoredRow => {
        let score = 0

        const domainLower = row.domain?.toLowerCase()
        if (domainLower) {
          if (domainLower.includes(query)) {
            score += SEARCH_SCORE_WEIGHTS.DOMAIN_PARTIAL
            if (domainLower === query) {
              score += SEARCH_SCORE_WEIGHTS.DOMAIN_EXACT - SEARCH_SCORE_WEIGHTS.DOMAIN_PARTIAL
            }
          }
        }

        if (row.serviceName?.toLowerCase().includes(query)) {
          score += SEARCH_SCORE_WEIGHTS.SERVICE_NAME
        }

        if (row.branch?.toLowerCase().includes(query)) {
          score += SEARCH_SCORE_WEIGHTS.BRANCH
        }

        if (row.owner?.toLowerCase().includes(query)) {
          score += SEARCH_SCORE_WEIGHTS.OWNER
        }

        if (row.env?.toLowerCase().includes(query)) {
          score += SEARCH_SCORE_WEIGHTS.ENV
        }

        return { ...row, score }
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
  }, [flatData, searchTerm])

  const exportToCsv = useCallback(() => {
    const rows = filteredData.map((row) => [
      row.domain ?? "—",
      row.serviceName ?? "",
      row.env ?? "—",
      row.branch ?? "—",
      row.owner ?? "",
      row.repository ?? "",
    ])

    const csvContent = [
      CSV_HEADERS.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "services-export.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }, [filteredData])

  const toggleRow = useCallback(
    (index: number) => {
      setExpandedRows((prev) => {
        const next = new Set(prev)
        if (next.has(index)) {
          next.delete(index)
        } else {
          next.add(index)
        }
        return next
      })
    },
    [],
  )

  const copyDomain = useCallback((domain: string) => {
    void navigator.clipboard.writeText(domain)
  }, [])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }, [])

  const handleToggleRow = useCallback(
    (index: number) => () => {
      toggleRow(index)
    },
    [toggleRow],
  )

  const handleCopyDomain = useCallback(
    (domain: string) => () => {
      copyDomain(domain)
    },
    [copyDomain],
  )

  const interfaceCount = filteredData.length
  const interfaceLabel = interfaceCount === 1 ? "interface" : "interfaces"

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Search domains, services, branches, owners..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-8 h-9 text-sm"
            aria-label="Search interfaces"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={exportToCsv}
          className="h-9 bg-transparent"
          aria-label="Export to CSV"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          CSV
        </Button>
      </div>

      <div className="text-xs text-muted-foreground" aria-live="polite" aria-atomic="true">
        {interfaceCount} {interfaceLabel}
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-8" aria-label="Expand row" />
              <TableHead className="font-medium">Domain</TableHead>
              <TableHead className="font-medium">Service</TableHead>
              <TableHead className="font-medium">Environment</TableHead>
              <TableHead className="font-medium">Branch</TableHead>
              <TableHead className="font-medium">Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interfaceCount === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                  No interfaces found
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => {
                const isExpanded = expandedRows.has(row.serviceIndex)
                const rowKey = `row-${row.serviceIndex}`
                const expandedKey = `${rowKey}-expanded`

                return (
                  <Fragment key={rowKey}>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell>
                        {row.repository && (
                          <button
                            type="button"
                            onClick={handleToggleRow(row.serviceIndex)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={isExpanded ? "Collapse row" : "Expand row"}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.domain ? (
                          <div className="flex items-center gap-2 group">
                            <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{row.domain}</code>
                            <button
                              type="button"
                              onClick={handleCopyDomain(row.domain)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label={`Copy domain ${row.domain}`}
                            >
                              <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{row.serviceName}</TableCell>
                      <TableCell>
                        {row.env ? (
                          <Badge variant="secondary" className={`text-xs font-normal ${getEnvColor(row.env)}`}>
                            {row.env}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.branch ? (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {row.branch}
                          </code>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.owner}</TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={expandedKey} className="bg-muted/20">
                        <TableCell colSpan={6} className="py-3 px-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-8">
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">Repository</div>
                                {row.repository ? (
                                  <a
                                    href={row.repository}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                                  >
                                    {row.repository.replace("https://github.com/", "")}
                                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </div>
                              {row.dependencies.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Dependencies</div>
                                  <div className="flex flex-wrap gap-1">
                                    {row.dependencies.map((dep) => (
                                      <span
                                        key={dep}
                                        className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground"
                                      >
                                        {dep}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
