"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ServiceTable } from "@/components/service-table"
import { Link, AlertCircle, Loader2 } from "lucide-react"

export function UrlViewer() {
  const [url, setUrl] = useState("")
  const [yamlContent, setYamlContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchYamlFromUrl = async () => {
    if (!url) return

    setLoading(true)
    setError("")

    try {
      // Convert GitHub URL to raw URL if needed
      let fetchUrl = url
      if (url.includes("github.com") && !url.includes("raw.githubusercontent.com")) {
        fetchUrl = url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")
      }

      const response = await fetch(fetchUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }

      const content = await response.text()
      setYamlContent(content)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch YAML file")
    } finally {
      setLoading(false)
    }
  }

  const exampleUrls = [
    "https://raw.githubusercontent.com/yourorg/services/main/inventory.yaml",
    "https://gist.githubusercontent.com/username/abc123/raw/services.yaml",
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">URL Viewer</h2>
          <p className="text-xs text-muted-foreground">Paste a GitHub raw URL to instantly visualize services</p>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="https://raw.githubusercontent.com/org/repo/main/services.yaml"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchYamlFromUrl()}
              className="h-9 text-sm"
            />
          </div>
          <Button onClick={fetchYamlFromUrl} disabled={loading || !url} size="sm" className="h-9 bg-transparent">
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Loading
              </>
            ) : (
              <>
                <Link className="h-3.5 w-3.5 mr-1.5" />
                Load
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">Example URLs:</div>
          {exampleUrls.map((exampleUrl, i) => (
            <div key={i} className="text-xs">
              <button onClick={() => setUrl(exampleUrl)} className="text-primary hover:underline font-mono text-[11px]">
                {exampleUrl}
              </button>
            </div>
          ))}
        </div>

        <Alert className="py-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">
            <strong>Pro tip:</strong> Share this page with{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-[11px]">?url=...</code> for instant, shareable
            inventories
          </AlertDescription>
        </Alert>
      </div>

      {yamlContent && (
        <div className="pt-4 border-t">
          <ServiceTable yamlContent={yamlContent} />
        </div>
      )}
    </div>
  )
}
