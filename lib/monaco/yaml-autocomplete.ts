import type { languages } from "monaco-editor"

interface CompletionItem {
  readonly label: string
  readonly kind: languages.CompletionItemKind
  readonly insertText: string
  readonly documentation: string
  readonly detail?: string
}

const SERVICE_PROPERTIES: readonly CompletionItem[] = [
  {
    label: "name",
    kind: 2,
    insertText: 'name: "$1"',
    documentation: "Service name (required)",
    detail: "string (required)",
  },
  {
    label: "owner",
    kind: 2,
    insertText: 'owner: "$1"',
    documentation: "Service owner (required)",
    detail: "string (required)",
  },
  {
    label: "repository",
    kind: 2,
    insertText: 'repository: "$1"',
    documentation: "GitHub repository URL",
    detail: "string",
  },
  {
    label: "interfaces",
    kind: 2,
    insertText: "interfaces:\n  - domain: \"$1\"\n    env: \"$2\"\n    branch: \"$3\"",
    documentation: "Array of interface definitions",
    detail: "array",
  },
  {
    label: "dependencies",
    kind: 2,
    insertText: 'dependencies: ["$1"]',
    documentation: "Array of dependency names",
    detail: "array",
  },
] as const

const INTERFACE_PROPERTIES: readonly CompletionItem[] = [
  {
    label: "domain",
    kind: 2,
    insertText: 'domain: "$1"',
    documentation: "Domain name (required)",
    detail: "string (required)",
  },
  {
    label: "env",
    kind: 2,
    insertText: 'env: "$1"',
    documentation: "Environment: production | staging | development",
    detail: "enum",
  },
  {
    label: "branch",
    kind: 2,
    insertText: 'branch: "$1"',
    documentation: "Git branch name",
    detail: "string",
  },
] as const

const ENV_VALUES: readonly CompletionItem[] = [
  {
    label: "production",
    kind: 12,
    insertText: "production",
    documentation: "Production environment",
  },
  {
    label: "staging",
    kind: 12,
    insertText: "staging",
    documentation: "Staging environment",
  },
  {
    label: "development",
    kind: 12,
    insertText: "development",
    documentation: "Development environment",
  },
] as const

function getContextualCompletions(
  line: string,
  position: number,
): readonly CompletionItem[] {
  const beforeCursor = line.slice(0, position)
  const trimmed = beforeCursor.trim()

  if (trimmed.endsWith("env:")) {
    return ENV_VALUES
  }

  if (trimmed.includes("interfaces:") || trimmed.match(/^\s*-\s*$/)) {
    return INTERFACE_PROPERTIES
  }

  if (trimmed.match(/^\s*-\s*name:/) || trimmed.match(/^\s*\w+:/)) {
    return SERVICE_PROPERTIES
  }

  if (trimmed.match(/^\s*-\s*\w+:/)) {
    return INTERFACE_PROPERTIES
  }

  return SERVICE_PROPERTIES
}

export function createYamlAutocompleteProvider(): languages.CompletionItemProvider {
  return {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const lineContent = model.getLineContent(position.lineNumber)
      const completions = getContextualCompletions(lineContent, position.column - 1)

      const filtered = completions.filter((item) => item.label.toLowerCase().includes(word.word.toLowerCase()))

      return {
        suggestions: filtered.map((item) => ({
          label: item.label,
          kind: item.kind,
          insertText: item.insertText,
          insertTextRules: 4,
          documentation: item.documentation,
          detail: item.detail,
          range,
        })),
      }
    },
    triggerCharacters: [":", "-", " "],
  }
}

