"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Upload, Download } from "lucide-react"
import { parseYaml, validateSchema } from "@/lib/yaml-utils"

interface YamlEditorProps {
  value: string
  onChange: (value: string) => void
}

export function YamlEditor({ value, onChange }: YamlEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [validation, setValidation] = useState<{ valid: boolean; error?: string }>({ valid: true })
  const [lineNumbers, setLineNumbers] = useState<number[]>([])

  useEffect(() => {
    const lines = value.split("\n").length
    setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1))

    // Validate YAML
    try {
      const parsed = parseYaml(value)
      const validationResult = validateSchema(parsed)
      setValidation(validationResult)
    } catch (error) {
      setValidation({
        valid: false,
        error: error instanceof Error ? error.message : "Invalid YAML syntax",
      })
    }
  }, [value])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        onChange(content)
      }
      reader.readAsText(file)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([value], { type: "text/yaml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "services.yaml"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">YAML Editor</h2>
          <p className="text-xs text-muted-foreground">Edit your service inventory</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const input = document.createElement("input")
              input.type = "file"
              input.accept = ".yaml,.yml"
              input.onchange = handleFileUpload as any
              input.click()
            }}
            className="h-8"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Upload
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 bg-transparent">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download
          </Button>
        </div>
      </div>

      {validation.valid ? (
        <Alert className="bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-900 py-2">
          <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
          <AlertDescription className="text-green-700 dark:text-green-400 text-xs">Valid YAML</AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">{validation.error || "Invalid YAML"}</AlertDescription>
        </Alert>
      )}

      {/* Editor */}
      <div className="border rounded-md overflow-hidden bg-muted/30">
        <div className="flex">
          {/* Line numbers */}
          <div className="bg-muted/50 px-2 py-2 text-right border-r select-none">
            {lineNumbers.map((num) => (
              <div key={num} className="text-xs text-muted-foreground leading-5 font-mono">
                {num}
              </div>
            ))}
          </div>

          {/* Text area */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 p-2 bg-transparent font-mono text-xs leading-5 focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none min-h-[500px]"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-md">
        <div className="font-semibold mb-1.5">Schema Reference:</div>
        <div className="font-mono space-y-0.5 text-[11px]">
          <div>
            • <span className="text-foreground">name</span>: string (required)
          </div>
          <div>
            • <span className="text-foreground">owner</span>: string (required)
          </div>
          <div>
            • <span className="text-foreground">repository</span>: URL string
          </div>
          <div>
            • <span className="text-foreground">interfaces</span>: array (domain, env, branch mappings)
          </div>
          <div className="ml-4">
            - <span className="text-foreground">domain</span>: string (DNS name)
          </div>
          <div className="ml-4">
            - <span className="text-foreground">env</span>: production | staging | development
          </div>
          <div className="ml-4">
            - <span className="text-foreground">branch</span>: string (git branch)
          </div>
          <div>
            • <span className="text-foreground">dependencies</span>: array of strings
          </div>
        </div>
      </div>
    </div>
  )
}
