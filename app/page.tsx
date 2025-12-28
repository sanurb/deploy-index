"use client"

import { useState, useEffect } from "react"
import { ServiceTable } from "@/components/service-table"
import { YamlEditor } from "@/components/yaml-editor"
import { UrlViewer } from "@/components/url-viewer"
import { CommandPalette } from "@/components/command-palette"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Table, Link } from "lucide-react"

const defaultYaml = `# Service Inventory
# Interface-first schema: each domain maps to env, branch, and service

services:
  - name: "User API"
    owner: "Platform Team"
    repository: "https://github.com/org/user-api"
    interfaces:
      - domain: "api.example.com"
        env: "production"
        branch: "main"
      - domain: "api-staging.example.com"
        env: "staging"
        branch: "staging"
    dependencies: ["PostgreSQL", "Redis"]
    
  - name: "Payment Service"
    owner: "Payments Team"
    repository: "https://github.com/org/payment-service"
    interfaces:
      - domain: "payments.example.com"
        env: "production"
        branch: "main"
      - domain: "payments-dev.example.com"
        env: "development"
        branch: "develop"
    dependencies: ["Stripe API", "PostgreSQL"]
    
  - name: "Analytics Dashboard"
    owner: "Analytics Team"
    repository: "https://github.com/org/analytics-dashboard"
    interfaces:
      - domain: "analytics.example.com"
        env: "production"
        branch: "main"
      - domain: "analytics-staging.example.com"
        env: "staging"
        branch: "staging"
    dependencies: ["Snowflake", "Redis"]
    
  - name: "Email Queue"
    owner: "Platform Team"
    repository: "https://github.com/org/email-queue"
    interfaces:
      - domain: "queue.internal.example.com"
        env: "production"
        branch: "main"
    dependencies: ["RabbitMQ", "SendGrid"]
`

export default function Page() {
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [activeTab, setActiveTab] = useState("table")
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [globalSearchQuery, setGlobalSearchQuery] = useState("")

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-foreground">Service Inventory</h1>
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>
        </div>
      </header>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        yamlContent={yamlContent}
        onNavigate={(tab) => setActiveTab(tab)}
        onSearch={(query) => {
          setGlobalSearchQuery(query)
          setActiveTab("table")
        }}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 h-9">
            <TabsTrigger value="table" className="flex items-center gap-1.5 text-xs">
              <Table className="h-3.5 w-3.5" />
              <span>Table</span>
            </TabsTrigger>
            <TabsTrigger value="editor" className="flex items-center gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              <span>Editor</span>
            </TabsTrigger>
            <TabsTrigger value="viewer" className="flex items-center gap-1.5 text-xs">
              <Link className="h-3.5 w-3.5" />
              <span>URL</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="mt-4">
            <ServiceTable yamlContent={yamlContent} initialSearchQuery={globalSearchQuery} />
          </TabsContent>

          <TabsContent value="editor" className="mt-4">
            <YamlEditor value={yamlContent} onChange={setYamlContent} />
          </TabsContent>

          <TabsContent value="viewer" className="mt-4">
            <UrlViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
