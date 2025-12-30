import type { Monaco } from "@monaco-editor/react"
import { createYamlAutocompleteProvider } from "./yaml-autocomplete"

let providerRegistered = false

export function setupYamlLanguage(monaco: Monaco): void {
  const languages = monaco.languages.getLanguages()
  const yamlLanguage = languages.find((lang: { id: string }) => lang.id === "yaml")

  if (!yamlLanguage) {
    return
  }

  if (providerRegistered) {
    return
  }

  monaco.languages.registerCompletionItemProvider("yaml", createYamlAutocompleteProvider())
  providerRegistered = true
}

