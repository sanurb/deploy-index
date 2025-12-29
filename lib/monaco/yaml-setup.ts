import type { Monaco } from "@monaco-editor/react"
import { createYamlAutocompleteProvider } from "./yaml-autocomplete"

export function setupYamlLanguage(monaco: Monaco): void {
  const languages = monaco.languages.getLanguages()
  const yamlLanguage = languages.find((lang) => lang.id === "yaml")

  if (!yamlLanguage) {
    return
  }

  monaco.languages.registerCompletionItemProvider("yaml", createYamlAutocompleteProvider())
}

