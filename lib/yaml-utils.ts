import type { Simplify } from "type-fest"

export interface ServiceInterface {
  readonly domain: string
  readonly env: string | null
  readonly branch: string | null
}

export interface Service {
  readonly name: string
  readonly owner: string
  readonly repository: string
  readonly dependencies: readonly string[]
  readonly interfaces: readonly ServiceInterface[] | undefined
}

export interface ParsedYaml {
  readonly services: readonly Service[]
}

interface ValidationSuccess {
  readonly valid: true
}

interface ValidationError {
  readonly valid: false
  readonly error: string
}

type ValidationResult = ValidationSuccess | ValidationError

interface InterfaceBuilder {
  domain?: string
  env?: string | null
  branch?: string | null
}

interface ServiceBuilder {
  name?: string
  owner?: string
  repository?: string
  dependencies?: readonly string[]
  interfaces?: readonly ServiceInterface[]
}

interface ParseContext {
  readonly indentLevel: number
  readonly currentService: ServiceBuilder | null
  readonly currentInterface: InterfaceBuilder | null
  readonly inInterfacesArray: boolean
  readonly inDependenciesArray: boolean
  readonly services: Service[]
  readonly dependencies: string[]
}

const SERVICE_ARRAY_KEY = "interfaces"
const DEPENDENCIES_KEY = "dependencies"

function getIndentLevel(line: string): number {
  let indent = 0
  for (const char of line) {
    if (char === " ") {
      indent++
    } else if (char === "\t") {
      indent += 2
    } else {
      break
    }
  }
  return indent
}

function isCommentOrEmpty(line: string): boolean {
      const trimmed = line.trim()
  return trimmed === "" || trimmed.startsWith("#")
}

function parseKeyValue(line: string): { key: string; value: string } | null {
  const match = line.match(/^(\w+):\s*(.*)$/)
  if (!match) {
    return null
  }

  const [, key, value] = match
  return { key, value: value.trim() }
}

function parseQuotedValue(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}

function parseArrayItem(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith("- ")) {
    return null
  }

  const item = trimmed.slice(2).trim()
  return parseQuotedValue(item)
}

function isArrayStart(value: string): boolean {
  return value === "" || value === "["
}

function parseInlineArray(value: string): readonly string[] {
  if (!value.startsWith("[") || !value.endsWith("]")) {
    return []
  }

  return value
            .slice(1, -1)
            .split(",")
    .map((item) => parseQuotedValue(item.trim()))
    .filter((item) => item.length > 0)
}

function finishCurrentService(context: ParseContext): ParseContext {
  if (!context.currentService || !context.currentService.name || !context.currentService.owner) {
    return context
  }

  const service: Service = {
    name: context.currentService.name,
    owner: context.currentService.owner,
    repository: context.currentService.repository ?? "",
    dependencies: context.dependencies.length > 0 ? [...context.dependencies] : [],
    interfaces: context.currentService.interfaces,
  }

  return {
    ...context,
    services: [...context.services, service],
    currentService: null,
    currentInterface: null,
    inInterfacesArray: false,
    inDependenciesArray: false,
    dependencies: [],
  }
}

function finishCurrentInterface(context: ParseContext): ParseContext {
  if (!context.currentInterface || !context.currentInterface.domain || !context.currentService) {
    return context
  }

  const serviceInterface: ServiceInterface = {
    domain: context.currentInterface.domain,
    env: context.currentInterface.env ?? null,
    branch: context.currentInterface.branch ?? null,
  }

  const interfaces = context.currentService.interfaces ? [...context.currentService.interfaces, serviceInterface] : [serviceInterface]

  return {
    ...context,
    currentService: {
      ...context.currentService,
      interfaces,
    },
    currentInterface: null,
  }
}

function handleServiceStart(line: string, context: ParseContext): ParseContext {
  const newContext = finishCurrentService(context)

  const nameMatch = line.match(/name:\s*(.+)$/)
  if (!nameMatch) {
    return newContext
  }

  const name = parseQuotedValue(nameMatch[1].trim())

  return {
    ...newContext,
    currentService: {
      name,
    } as ServiceBuilder,
  }
}

function handleInterfaceStart(context: ParseContext): ParseContext {
  const newContext = finishCurrentInterface(context)

  return {
    ...newContext,
    inInterfacesArray: true,
    currentInterface: {},
  }
}

function handleKeyValue(line: string, context: ParseContext, indentLevel: number): ParseContext {
  const kv = parseKeyValue(line)
  if (!kv) {
    return context
  }

  const { key, value } = kv

  if (context.inInterfacesArray && context.currentInterface && indentLevel > context.indentLevel) {
    const parsedValue = parseQuotedValue(value)

    if (key === "domain") {
      return {
        ...context,
        currentInterface: {
          ...context.currentInterface,
          domain: parsedValue,
        },
      }
    }

    if (key === "env") {
      return {
        ...context,
        currentInterface: {
          ...context.currentInterface,
          env: parsedValue,
        },
      }
    }

    if (key === "branch") {
      return {
        ...context,
        currentInterface: {
          ...context.currentInterface,
          branch: parsedValue,
        },
      }
    }
  }

  if (!context.currentService) {
    return context
  }

  if (key === SERVICE_ARRAY_KEY) {
    if (isArrayStart(value)) {
      return {
        ...context,
        inInterfacesArray: true,
        indentLevel,
      }
    }

    const inlineArray = parseInlineArray(value)
    if (inlineArray.length > 0) {
      return context
    }
  }

  if (key === DEPENDENCIES_KEY) {
    if (isArrayStart(value)) {
      return {
        ...context,
        inDependenciesArray: true,
        indentLevel,
      }
    }

    const inlineArray = parseInlineArray(value)
    if (inlineArray.length > 0) {
      return {
        ...context,
        currentService: {
          ...context.currentService,
          dependencies: inlineArray,
        },
      }
    }
  }

  if (key === "repository") {
    return {
      ...context,
      currentService: {
        ...context.currentService,
        repository: parseQuotedValue(value),
      } as ServiceBuilder,
    }
  }

  if (key === "owner") {
    return {
      ...context,
      currentService: {
        ...context.currentService,
        owner: parseQuotedValue(value),
      } as ServiceBuilder,
    }
  }

  return context
}

function handleArrayItem(line: string, context: ParseContext, indentLevel: number): ParseContext {
  if (context.inDependenciesArray && indentLevel > context.indentLevel) {
    const item = parseArrayItem(line)
    if (item) {
      return {
        ...context,
        dependencies: [...context.dependencies, item],
      }
    }
  }

  if (context.inInterfacesArray && line.trim().startsWith("- ")) {
    const newContext = finishCurrentInterface(context)
    return {
      ...newContext,
      currentInterface: {},
      indentLevel,
    }
  }

  return context
}

export function parseYaml(yamlString: string): ParsedYaml {
  const lines = yamlString.split("\n")
  let context: ParseContext = {
    indentLevel: 0,
    currentService: null,
    currentInterface: null,
    inInterfacesArray: false,
    inDependenciesArray: false,
    services: [],
    dependencies: [],
  }

  for (const line of lines) {
    if (isCommentOrEmpty(line)) {
      continue
    }

    const indentLevel = getIndentLevel(line)
    const trimmed = line.trim()

    if (trimmed.startsWith("- name:") || (trimmed.startsWith("- ") && trimmed.includes("name:"))) {
      context = handleServiceStart(trimmed, context)
      context = {
        ...context,
        indentLevel: 2,
      }
      continue
    }

    if (context.inInterfacesArray && trimmed.startsWith("- ")) {
      const newContext = finishCurrentInterface(context)
      const interfaceItemMatch = trimmed.match(/^-\s+(\w+):\s*(.+)$/)
      if (interfaceItemMatch) {
        const [, key, value] = interfaceItemMatch
        const parsedValue = parseQuotedValue(value.trim())
        const newInterface: InterfaceBuilder = {}
        if (key === "domain") {
          newInterface.domain = parsedValue
        } else if (key === "env") {
          newInterface.env = parsedValue
        } else if (key === "branch") {
          newInterface.branch = parsedValue
        }
        context = {
          ...newContext,
          currentInterface: newInterface,
          indentLevel,
        }
      } else {
        context = {
          ...newContext,
          currentInterface: {},
          indentLevel,
        }
      }
      continue
    }

    if (context.inInterfacesArray && context.currentInterface && indentLevel > context.indentLevel) {
      context = handleKeyValue(trimmed, context, indentLevel)
      continue
    }

    const arrayItem = parseArrayItem(trimmed)
    if (arrayItem !== null && !context.inInterfacesArray) {
      context = handleArrayItem(trimmed, context, indentLevel)
      continue
    }

    const kv = parseKeyValue(trimmed)
    if (kv) {
      context = handleKeyValue(trimmed, context, indentLevel)
      if (kv.key !== SERVICE_ARRAY_KEY && kv.key !== DEPENDENCIES_KEY) {
        context = {
          ...context,
          indentLevel,
        }
      }
      continue
    }
  }

  context = finishCurrentInterface(context)
  context = finishCurrentService(context)

  return {
    services: context.services,
  }
}

export function validateSchema(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "YAML must be an object" }
  }

  const dataObj = data as Record<string, unknown>

  if (!Array.isArray(dataObj.services)) {
    return { valid: false, error: 'Missing "services" array' }
  }

  for (let i = 0; i < dataObj.services.length; i++) {
    const service = dataObj.services[i]

    if (!service || typeof service !== "object") {
      return { valid: false, error: `Service at index ${i} is not a valid object` }
    }

    const serviceObj = service as Record<string, unknown>

    if (typeof serviceObj.name !== "string" || serviceObj.name.length === 0) {
      return { valid: false, error: `Service at index ${i} is missing required field: name` }
    }

    if (typeof serviceObj.owner !== "string" || serviceObj.owner.length === 0) {
      return { valid: false, error: `Service "${serviceObj.name}" is missing required field: owner` }
    }

    if (serviceObj.interfaces !== undefined) {
      if (!Array.isArray(serviceObj.interfaces)) {
        return { valid: false, error: `Service "${serviceObj.name}" interfaces must be an array` }
      }

      for (let j = 0; j < serviceObj.interfaces.length; j++) {
        const iface = serviceObj.interfaces[j]

        if (!iface || typeof iface !== "object") {
          return {
            valid: false,
            error: `Service "${serviceObj.name}" interface at index ${j} is not a valid object`,
          }
        }

        const ifaceObj = iface as Record<string, unknown>

        if (typeof ifaceObj.domain !== "string" || ifaceObj.domain.length === 0) {
          return {
            valid: false,
            error: `Service "${serviceObj.name}" interface at index ${j} is missing required field: domain`,
          }
        }

        const validEnvs = ["production", "staging", "development"]
        if (ifaceObj.env !== undefined && typeof ifaceObj.env === "string") {
          if (!validEnvs.includes(ifaceObj.env.toLowerCase())) {
          return {
            valid: false,
              error: `Service "${serviceObj.name}" interface "${ifaceObj.domain}" has invalid env. Must be one of: ${validEnvs.join(", ")}`,
            }
          }
        }
      }
    }
  }

  return { valid: true }
}
