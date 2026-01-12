import type { languages } from "monaco-editor";

interface CompletionItem {
  readonly label: string;
  readonly kind: languages.CompletionItemKind;
  readonly insertText: string;
  readonly documentation: string;
  readonly detail?: string;
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
    insertText:
      'interfaces:\n  - domain: "$1"\n    env: "$2"\n    branch: "$3"',
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
] as const;

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
  {
    label: "runtime",
    kind: 2,
    insertText: 'runtime:\n    type: "$1"\n    id: "$2"',
    documentation:
      "Runtime locator (type: ec2|vm|k8s|lambda|container|paas|unknown, id: runtime identifier)",
    detail: "object",
  },
] as const;

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
] as const;

const RUNTIME_TYPE_VALUES: readonly CompletionItem[] = [
  {
    label: "ec2",
    kind: 12,
    insertText: "ec2",
    documentation: "EC2 instance",
  },
  {
    label: "vm",
    kind: 12,
    insertText: "vm",
    documentation: "Virtual machine",
  },
  {
    label: "k8s",
    kind: 12,
    insertText: "k8s",
    documentation: "Kubernetes cluster/namespace",
  },
  {
    label: "lambda",
    kind: 12,
    insertText: "lambda",
    documentation: "AWS Lambda function",
  },
  {
    label: "container",
    kind: 12,
    insertText: "container",
    documentation: "Container runtime",
  },
  {
    label: "paas",
    kind: 12,
    insertText: "paas",
    documentation: "Platform as a Service",
  },
  {
    label: "unknown",
    kind: 12,
    insertText: "unknown",
    documentation: "Unknown runtime",
  },
] as const;

const RUNTIME_PROPERTIES: readonly CompletionItem[] = [
  {
    label: "type",
    kind: 2,
    insertText: 'type: "$1"',
    documentation: "Runtime type: ec2|vm|k8s|lambda|container|paas|unknown",
    detail: "enum",
  },
  {
    label: "id",
    kind: 2,
    insertText: 'id: "$1"',
    documentation:
      "Runtime identifier (e.g., instance ID, cluster/namespace, function name)",
    detail: "string",
  },
] as const;

function getContextualCompletions(
  line: string,
  position: number
): readonly CompletionItem[] {
  const beforeCursor = line.slice(0, position);
  const trimmed = beforeCursor.trim();
  const previousLines = line.split("\n").slice(0, -1).join("\n");

  if (trimmed.endsWith("env:")) {
    return ENV_VALUES;
  }

  if (
    trimmed.endsWith("runtime.type:") ||
    (trimmed.includes("runtime:") && trimmed.endsWith("type:"))
  ) {
    return RUNTIME_TYPE_VALUES;
  }

  if (
    trimmed.includes("runtime:") &&
    !trimmed.includes("type:") &&
    !trimmed.includes("id:")
  ) {
    return RUNTIME_PROPERTIES;
  }

  const isInInterfacesArray =
    previousLines.includes("interfaces:") || trimmed.match(/^\s*-\s*$/);
  const isInterfaceItem =
    trimmed.match(/^\s*-\s*\w+:/) && !trimmed.match(/^\s*-\s*name:/);

  if (isInInterfacesArray || isInterfaceItem) {
    return INTERFACE_PROPERTIES;
  }

  if (
    trimmed.match(/^\s*-\s*name:/) ||
    (trimmed.match(/^\s*\w+:/) && !isInInterfacesArray)
  ) {
    return SERVICE_PROPERTIES;
  }

  return SERVICE_PROPERTIES;
}

export function createYamlAutocompleteProvider(): languages.CompletionItemProvider {
  return {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const lineContent = model.getLineContent(position.lineNumber);
      const completions = getContextualCompletions(
        lineContent,
        position.column - 1
      );

      const filtered = completions.filter((item) =>
        item.label.toLowerCase().includes(word.word.toLowerCase())
      );

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
      };
    },
    triggerCharacters: [":", "-", " "],
  };
}
