"use client"

import { useState, useMemo, useEffect } from "react"
import { useAtomValue } from "jotai"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { parseYaml } from "@/lib/yaml-utils"
import { Globe, Package, User, GitBranch, ExternalLink, FileText } from "lucide-react"
import { contentAtom } from "@/lib/state/draft-atoms"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (tab: string) => void
  onSearch: (query: string) => void
}

export function CommandPalette({ open, onOpenChange, onNavigate, onSearch }: CommandPaletteProps) {
  const yamlContent = useAtomValue(contentAtom)
  const [searchQuery, setSearchQuery] = useState("")

  // Parse services and create searchable index
  const searchIndex = useMemo(() => {
    try {
      const parsed = parseYaml(yamlContent)
      const services = parsed.services || []

      const domains: Array<{
        type: string
        value: string
        service: string
        env: string
        branch: string
        repo: string
      }> = []
      const serviceNames: Array<{ type: string; value: string; owner: string; repo: string }> = []
      const owners: Array<{ type: string; value: string; services: string[] }> = []
      const branches: Array<{ type: string; value: string; service: string; domain: string }> = []

      const ownerMap = new Map<string, string[]>()

      services.forEach((service: any) => {
        // Index service names
        serviceNames.push({
          type: "service",
          value: service.name || "",
          owner: service.owner || "",
          repo: service.repository || "",
        })

        // Index owners
        if (service.owner) {
          if (!ownerMap.has(service.owner)) {
            ownerMap.set(service.owner, [])
          }
          ownerMap.get(service.owner)!.push(service.name || "")
        }

        // Index domains (interfaces) as first-class citizens
        if (service.interfaces && Array.isArray(service.interfaces)) {
          service.interfaces.forEach((iface: any) => {
            if (iface.domain) {
              domains.push({
                type: "domain",
                value: iface.domain,
                service: service.name || "",
                env: iface.env || "unknown",
                branch: iface.branch || "unknown",
                repo: service.repository || "",
              })
            }

            // Index branches
            if (iface.branch) {
              branches.push({
                type: "branch",
                value: iface.branch,
                service: service.name || "",
                domain: iface.domain || "",
              })
            }
          })
        }
      })

      // Convert owner map to array
      ownerMap.forEach((services, owner) => {
        owners.push({
          type: "owner",
          value: owner,
          services,
        })
      })

      return { domains, serviceNames, owners, branches }
    } catch {
      return { domains: [], serviceNames: [], owners: [], branches: [] }
    }
  }, [yamlContent])

  // Filter and rank results based on search query
  const results = useMemo(() => {
    if (!searchQuery.trim()) {
      return {
        domains: searchIndex.domains.slice(0, 5),
        services: searchIndex.serviceNames.slice(0, 5),
        owners: searchIndex.owners.slice(0, 3),
        branches: searchIndex.branches.slice(0, 3),
      }
    }

    const query = searchQuery.toLowerCase()

    const filteredDomains = searchIndex.domains
      .filter(
        (d) =>
          (d.value || "").toLowerCase().includes(query) ||
          (d.service || "").toLowerCase().includes(query) ||
          (d.env || "").toLowerCase().includes(query) ||
          (d.branch || "").toLowerCase().includes(query),
      )
      .slice(0, 5)

    const filteredServices = searchIndex.serviceNames
      .filter(
        (s) =>
          (s.value || "").toLowerCase().includes(query) ||
          (s.owner || "").toLowerCase().includes(query) ||
          (s.repo || "").toLowerCase().includes(query),
      )
      .slice(0, 5)

    const filteredOwners = searchIndex.owners.filter((o) => (o.value || "").toLowerCase().includes(query)).slice(0, 3)

    const filteredBranches = searchIndex.branches
      .filter(
        (b) =>
          (b.value || "").toLowerCase().includes(query) ||
          (b.service || "").toLowerCase().includes(query) ||
          (b.domain || "").toLowerCase().includes(query),
      )
      .slice(0, 3)

    return {
      domains: filteredDomains,
      services: filteredServices,
      owners: filteredOwners,
      branches: filteredBranches,
    }
  }, [searchQuery, searchIndex])

  const hasResults =
    results.domains.length > 0 ||
    results.services.length > 0 ||
    results.owners.length > 0 ||
    results.branches.length > 0

  useEffect(() => {
    if (!open) {
      setSearchQuery("")
    }
  }, [open])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search domains, services, branches, owners..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        {!hasResults && <CommandEmpty>No results found.</CommandEmpty>}

        {results.domains.length > 0 && (
          <CommandGroup heading="Domains">
            {results.domains.map((domain, i) => (
              <CommandItem
                key={`domain-${i}`}
                onSelect={() => {
                  onSearch(domain.value)
                  onOpenChange(false)
                }}
              >
                <Globe className="mr-2 h-4 w-4 text-blue-600" />
                <div className="flex-1">
                  <div className="font-medium">{domain.value}</div>
                  <div className="text-xs text-muted-foreground">
                    {domain.service} · {domain.env} · {domain.branch}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.services.length > 0 && (
          <CommandGroup heading="Services">
            {results.services.map((service, i) => (
              <CommandItem
                key={`service-${i}`}
                onSelect={() => {
                  onSearch(service.value)
                  onOpenChange(false)
                }}
              >
                <Package className="mr-2 h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <div className="font-medium">{service.value}</div>
                  {service.owner && <div className="text-xs text-muted-foreground">{service.owner}</div>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.branches.length > 0 && (
          <CommandGroup heading="Branches">
            {results.branches.map((branch, i) => (
              <CommandItem
                key={`branch-${i}`}
                onSelect={() => {
                  onSearch(branch.value)
                  onOpenChange(false)
                }}
              >
                <GitBranch className="mr-2 h-4 w-4 text-purple-600" />
                <div className="flex-1">
                  <div className="font-medium">{branch.value}</div>
                  <div className="text-xs text-muted-foreground">
                    {branch.service} · {branch.domain}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.owners.length > 0 && (
          <CommandGroup heading="Owners">
            {results.owners.map((owner, i) => (
              <CommandItem
                key={`owner-${i}`}
                onSelect={() => {
                  onSearch(owner.value)
                  onOpenChange(false)
                }}
              >
                <User className="mr-2 h-4 w-4 text-orange-600" />
                <div className="flex-1">
                  <div className="font-medium">{owner.value}</div>
                  <div className="text-xs text-muted-foreground">{owner.services.length} services</div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Actions">
          <CommandItem
            key="action-editor"
            onSelect={() => {
              onNavigate("editor")
              onOpenChange(false)
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            <span>Edit YAML</span>
          </CommandItem>
          <CommandItem
            key="action-viewer"
            onSelect={() => {
              onNavigate("viewer")
              onOpenChange(false)
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            <span>Import from URL</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
