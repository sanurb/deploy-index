/**
 * Valid runtime types for service interfaces
 */
const RUNTIME_TYPES = {
  EC2: "ec2",
  VM: "vm",
  K8S: "k8s",
  LAMBDA: "lambda",
  CONTAINER: "container",
  PAAS: "paas",
  UNKNOWN: "unknown",
} as const;

/**
 * Valid environment types
 */
const ENVIRONMENT_TYPES = {
  PRODUCTION: "production",
  STAGING: "staging",
  DEVELOPMENT: "development",
} as const;

type RuntimeType = (typeof RUNTIME_TYPES)[keyof typeof RUNTIME_TYPES];
type EnvironmentType =
  (typeof ENVIRONMENT_TYPES)[keyof typeof ENVIRONMENT_TYPES];

export type { RuntimeType };

/**
 * Runtime locator identifying where a service interface is deployed
 */
export interface RuntimeLocator {
  readonly type: RuntimeType;
  readonly id: string;
}

/**
 * Service interface representing a deployment endpoint
 */
export interface ServiceInterface {
  readonly domain: string;
  readonly env: string | null;
  readonly branch: string | null;
  readonly runtime: RuntimeLocator | null;
}

/**
 * Service definition with its interfaces and dependencies
 */
export interface Service {
  readonly name: string;
  readonly owner: string;
  readonly repository: string;
  readonly dependencies: readonly string[];
  readonly interfaces: readonly ServiceInterface[] | undefined;
}

/**
 * Parsed YAML structure
 */
export interface ParsedYaml {
  readonly services: readonly Service[];
}

interface ValidationSuccess {
  readonly valid: true;
}

interface ValidationError {
  readonly valid: false;
  readonly error: string;
}

type ValidationResult = ValidationSuccess | ValidationError;

/**
 * Builder for constructing a service interface during parsing
 * Properties are mutable during construction
 */
interface InterfaceBuilder {
  domain?: string;
  env?: string | null;
  branch?: string | null;
  runtime?: RuntimeLocator | null;
}

/**
 * Builder for constructing a service during parsing
 * Properties are mutable during construction
 */
interface ServiceBuilder {
  name?: string;
  owner?: string;
  repository?: string;
  dependencies?: readonly string[];
  interfaces?: readonly ServiceInterface[];
}

const SERVICE_ARRAY_KEY = "interfaces";
const DEPENDENCIES_KEY = "dependencies";
const RUNTIME_KEY = "runtime";
const DOMAIN_KEY = "domain";
const ENV_KEY = "env";
const BRANCH_KEY = "branch";
const TYPE_KEY = "type";
const ID_KEY = "id";
const REPOSITORY_KEY = "repository";
const OWNER_KEY = "owner";
const NAME_KEY = "name";

const ARRAY_ITEM_PREFIX = "- ";
const COMMENT_PREFIX = "#";
const QUOTE_DOUBLE = '"';
const QUOTE_SINGLE = "'";
const ARRAY_START = "[";
const ARRAY_END = "]";
const TAB_SIZE = 2;

const VALID_RUNTIME_TYPES = new Set<RuntimeType>(Object.values(RUNTIME_TYPES));
const VALID_ENV_TYPES = new Set<EnvironmentType>(
  Object.values(ENVIRONMENT_TYPES)
);

const RE_KEY_VALUE = /^(\w+):\s*(.*)$/;
const RE_SERVICE_START = /^-\s+name:\s*(.+)$/;
const RE_INTERFACE_ITEM = /^-\s+(\w+):\s*(.+)$/;

/**
 * Calculates the indentation level of a line (spaces only, tabs count as 2 spaces)
 */
function getIndentLevel(line: string): number {
  let indent = 0;
  for (const char of line) {
    if (char === " ") {
      indent++;
      continue;
    }

    if (char === "\t") {
      indent += TAB_SIZE;
      continue;
    }

    break;
  }
  return indent;
}

/**
 * Checks if a line is empty or a comment
 */
function isCommentOrEmpty(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length === 0 || trimmed.startsWith(COMMENT_PREFIX);
}

/**
 * Parses a key-value pair from a line (e.g., "key: value")
 */
function parseKeyValue(
  line: string
): { readonly key: string; readonly value: string } | null {
  const match = line.match(RE_KEY_VALUE);
  if (!match) {
    return null;
  }

  const key = match[1] ?? "";
  const value = (match[2] ?? "").trim();
  return { key, value };
}

/**
 * Removes quotes from a value if present
 */
function parseQuotedValue(value: string): string {
  if (
    (value.startsWith(QUOTE_DOUBLE) && value.endsWith(QUOTE_DOUBLE)) ||
    (value.startsWith(QUOTE_SINGLE) && value.endsWith(QUOTE_SINGLE))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Parses an array item from a line starting with "- "
 */
function parseArrayItem(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith(ARRAY_ITEM_PREFIX)) {
    return null;
  }

  const item = trimmed.slice(ARRAY_ITEM_PREFIX.length).trim();
  return parseQuotedValue(item);
}

/**
 * Checks if a value indicates the start of an array (empty string or "[")
 */
function isArrayStart(value: string): boolean {
  return value === "" || value === ARRAY_START;
}

/**
 * Parses an inline array from a value (e.g., "[item1, item2]")
 */
function parseInlineArray(value: string): readonly string[] {
  if (!(value.startsWith(ARRAY_START) && value.endsWith(ARRAY_END))) {
    return [];
  }

  const body = value.slice(1, -1);
  if (body.trim().length === 0) {
    return [];
  }

  const parts = body.split(",");
  const out: string[] = [];
  for (const part of parts) {
    const item = parseQuotedValue(part.trim());
    if (item.length === 0) {
      continue;
    }
    out.push(item);
  }
  return out;
}

/**
 * Normalizes runtime type to a valid RuntimeType
 */
function normalizeRuntimeType(value: string): RuntimeType {
  const lower = value.toLowerCase() as RuntimeType;
  return VALID_RUNTIME_TYPES.has(lower) ? lower : RUNTIME_TYPES.UNKNOWN;
}

/**
 * Creates a RuntimeLocator from builder data, or null if invalid
 */
function buildRuntime(builder: InterfaceBuilder): RuntimeLocator | null {
  const rt = builder.runtime;
  if (!rt) {
    return null;
  }

  const id = rt.id.trim();
  if (id.length === 0) {
    return null;
  }

  return {
    type: rt.type ?? RUNTIME_TYPES.UNKNOWN,
    id,
  };
}

function buildInterface(builder: InterfaceBuilder): ServiceInterface | null {
  const domain = builder.domain?.trim();
  if (!domain || domain.length === 0) {
    return null;
  }

  return {
    domain,
    env: builder.env?.trim() ?? null,
    branch: builder.branch?.trim() ?? null,
    runtime: buildRuntime(builder),
  };
}

function tryParseServiceName(trimmed: string): string | null {
  const match = trimmed.match(RE_SERVICE_START);
  if (!match) {
    return null;
  }
  return parseQuotedValue((match[1] ?? "").trim());
}

type EnvParseState = {
  inInterfacesArray: boolean;
  inDependenciesArray: boolean;
  inRuntimeBlock: boolean;
  serviceIndent: number;
  interfaceArrayIndent: number;
  runtimeIndent: number;
  dependenciesIndent: number;
};

function createInitialState(): EnvParseState {
  return {
    inInterfacesArray: false,
    inDependenciesArray: false,
    inRuntimeBlock: false,
    serviceIndent: 0,
    interfaceArrayIndent: 0,
    runtimeIndent: 0,
    dependenciesIndent: 0,
  };
}

type ServiceAccumulator = {
  currentService: ServiceBuilder | null;
  currentInterface: InterfaceBuilder | null;
  dependencies: string[];
  services: Service[];
};

function createAccumulator(): ServiceAccumulator {
  return {
    currentService: null,
    currentInterface: null,
    dependencies: [],
    services: [],
  };
}

function finishCurrentInterface(
  acc: ServiceAccumulator,
  state: EnvParseState
): void {
  if (!(acc.currentService && acc.currentInterface)) {
    acc.currentInterface = null;
    state.inRuntimeBlock = false;
    state.runtimeIndent = 0;
    return;
  }

  const iface = buildInterface(acc.currentInterface);
  acc.currentInterface = null;
  state.inRuntimeBlock = false;
  state.runtimeIndent = 0;

  if (!iface) {
    return;
  }

  const existing = acc.currentService.interfaces ?? [];
  acc.currentService.interfaces = [...existing, iface];
}

function finishCurrentService(
  acc: ServiceAccumulator,
  state: EnvParseState
): void {
  finishCurrentInterface(acc, state);

  const svc = acc.currentService;
  acc.currentService = null;

  state.inInterfacesArray = false;
  state.inDependenciesArray = false;
  state.inRuntimeBlock = false;
  state.serviceIndent = 0;
  state.interfaceArrayIndent = 0;
  state.runtimeIndent = 0;
  state.dependenciesIndent = 0;

  if (!(svc?.name && svc.owner)) {
    acc.dependencies = [];
    return;
  }

  // BUGFIX (critical): inline dependencies were stored on svc.dependencies but were ignored.
  // Prefer svc.dependencies when present, otherwise use accumulated dependencies from block list.
  const deps = svc.dependencies ?? acc.dependencies;
  const dependencies = deps.length > 0 ? [...deps] : [];

  acc.services.push({
    name: svc.name,
    owner: svc.owner,
    repository: svc.repository ?? "",
    dependencies,
    interfaces: svc.interfaces,
  });

  acc.dependencies = [];
}

function isServiceStart(trimmed: string): boolean {
  if (trimmed.startsWith("- name:")) {
    return true;
  }
  return trimmed.startsWith(ARRAY_ITEM_PREFIX) && trimmed.includes("name:");
}

function parseServiceStart(
  trimmed: string,
  acc: ServiceAccumulator,
  state: EnvParseState
): void {
  finishCurrentService(acc, state);

  const name = tryParseServiceName(trimmed);
  if (!name) {
    return;
  }

  acc.currentService = { name };
  acc.currentInterface = null;

  // Original behavior: set indent baseline to 2 for top-level service entries.
  state.serviceIndent = 2;
}

function maybeExitBlocksOnIndent(indent: number, state: EnvParseState): void {
  // Performance + correctness: if indentation decreases, we must exit nested blocks.
  // This prevents accidental "sticky" flags when YAML structure ends.
  if (state.inRuntimeBlock && indent <= state.runtimeIndent) {
    state.inRuntimeBlock = false;
    state.runtimeIndent = 0;
  }

  if (state.inDependenciesArray && indent <= state.dependenciesIndent) {
    state.inDependenciesArray = false;
    state.dependenciesIndent = 0;
  }

  if (state.inInterfacesArray && indent <= state.interfaceArrayIndent) {
    // We still allow interface array items at exactly interfaceArrayIndent (they start with "- ").
    // Exiting happens only when we fall back to service-level indentation or less.
    if (indent <= state.serviceIndent) {
      state.inInterfacesArray = false;
      state.interfaceArrayIndent = 0;
    }
  }
}

type ServiceKeyValueHandler = (args: {
  readonly value: string;
  readonly indent: number;
  readonly acc: ServiceAccumulator;
  readonly state: EnvParseState;
}) => void;

const SERVICE_KEY_VALUE_HANDLERS: Readonly<
  Record<string, ServiceKeyValueHandler>
> = {
  [SERVICE_ARRAY_KEY]: ({ value, indent, state }) => {
    if (isArrayStart(value)) {
      state.inInterfacesArray = true;
      state.interfaceArrayIndent = indent;
      state.inDependenciesArray = false;
      return;
    }

    // ignore inline interfaces array.
    parseInlineArray(value);
  },

  [DEPENDENCIES_KEY]: ({ value, indent, acc, state }) => {
    if (isArrayStart(value)) {
      state.inDependenciesArray = true;
      state.dependenciesIndent = indent;
      acc.dependencies = [];
      return;
    }

    const inline = parseInlineArray(value);
    if (inline.length > 0) {
      // Keep both places consistent (critical correctness).
      const svc = acc.currentService;
      if (svc) {
        svc.dependencies = inline;
      }
      acc.dependencies = [...inline];
    }
  },

  [REPOSITORY_KEY]: ({ value, acc }) => {
    const svc = acc.currentService;
    if (!svc) {
      return;
    }
    svc.repository = parseQuotedValue(value);
  },

  [OWNER_KEY]: ({ value, acc }) => {
    const svc = acc.currentService;
    if (!svc) {
      return;
    }
    svc.owner = parseQuotedValue(value);
  },

  [NAME_KEY]: ({ value, acc }) => {
    const svc = acc.currentService;
    if (!svc) {
      return;
    }
    svc.name = parseQuotedValue(value);
  },
};

function handleServiceKeyValue(
  key: string,
  value: string,
  indent: number,
  acc: ServiceAccumulator,
  state: EnvParseState
): void {
  // Fast exit (no work without service)
  if (!acc.currentService) {
    return;
  }

  const handler = SERVICE_KEY_VALUE_HANDLERS[key];
  if (!handler) {
    return;
  }

  handler({ value, indent, acc, state });
}

function handleRuntimeKeyValue(
  key: string,
  value: string,
  acc: ServiceAccumulator
): void {
  const iface = acc.currentInterface;
  if (!iface) {
    return;
  }

  const rt = iface.runtime ?? { type: RUNTIME_TYPES.UNKNOWN, id: "" };
  const parsed = parseQuotedValue(value);

  const handlers: Readonly<Record<string, (v: string) => void>> = {
    [TYPE_KEY]: (v) => {
      iface.runtime = { ...rt, type: normalizeRuntimeType(v) };
    },
    [ID_KEY]: (v) => {
      iface.runtime = { ...rt, id: v.trim() };
    },
  };

  const handler = handlers[key];
  if (!handler) {
    return;
  }

  handler(parsed);
}

function handleInterfacePropertyKeyValue(
  key: string,
  value: string,
  acc: ServiceAccumulator,
  state: EnvParseState
): void {
  const iface = acc.currentInterface;
  if (!iface) {
    return;
  }

  const parsed = parseQuotedValue(value);

  const handlers: Readonly<Record<string, (v: string) => void>> = {
    [DOMAIN_KEY]: (v) => {
      iface.domain = v;
      state.inRuntimeBlock = false;
      state.runtimeIndent = 0;
    },
    [ENV_KEY]: (v) => {
      iface.env = v;
      state.inRuntimeBlock = false;
      state.runtimeIndent = 0;
    },
    [BRANCH_KEY]: (v) => {
      iface.branch = v;
      state.inRuntimeBlock = false;
      state.runtimeIndent = 0;
    },
    [RUNTIME_KEY]: () => {
      // runtime: starts a nested object block when written as "runtime:" or "runtime: ["
      // We treat both as block-start (legacy behavior).
      state.inRuntimeBlock = true;
      state.runtimeIndent = state.interfaceArrayIndent;
    },
  };

  const handler = handlers[key];
  if (!handler) {
    return;
  }

  handler(parsed);
}

function handleInterfaceKeyValue(
  key: string,
  value: string,
  indent: number,
  acc: ServiceAccumulator,
  state: EnvParseState
): void {
  if (key === RUNTIME_KEY && isArrayStart(value)) {
    state.inRuntimeBlock = true;
    state.runtimeIndent = indent;
    return;
  }

  if (state.inRuntimeBlock && indent > state.runtimeIndent) {
    handleRuntimeKeyValue(key, value, acc);
    return;
  }

  handleInterfacePropertyKeyValue(key, value, acc, state);
}

function handleNewInterfaceItem(
  trimmed: string,
  indent: number,
  acc: ServiceAccumulator,
  state: EnvParseState
): void {
  finishCurrentInterface(acc, state);

  const match = trimmed.match(RE_INTERFACE_ITEM);
  const key = match?.[1];
  const raw = match?.[2];
  const parsedValue = raw ? parseQuotedValue(raw.trim()) : undefined;

  const builder: InterfaceBuilder = {};

  const setByKey: Readonly<
    Record<string, (b: InterfaceBuilder, v: string) => void>
  > = {
    [DOMAIN_KEY]: (b, v) => {
      b.domain = v;
    },
    [ENV_KEY]: (b, v) => {
      b.env = v;
    },
    [BRANCH_KEY]: (b, v) => {
      b.branch = v;
    },
  };

  const setter = key ? setByKey[key] : undefined;
  if (setter && parsedValue !== undefined) {
    setter(builder, parsedValue);
  }

  acc.currentInterface = builder;
  state.interfaceArrayIndent = indent;
  state.inRuntimeBlock = false;
  state.runtimeIndent = 0;
}

function handleDependenciesArrayItem(
  trimmed: string,
  indent: number,
  acc: ServiceAccumulator,
  state: EnvParseState
): void {
  if (!state.inDependenciesArray) {
    return;
  }

  if (indent <= state.dependenciesIndent) {
    return;
  }

  const item = parseArrayItem(trimmed);
  if (item === null) {
    return;
  }

  acc.dependencies.push(item);
}

/**
 * Parses YAML string into structured service data
 *
 * @param yamlString - Raw YAML content to parse
 * @returns Parsed services structure
 */
export function parseYaml(yamlString: string): ParsedYaml {
  const lines = yamlString.split("\n");
  const state = createInitialState();
  const acc = createAccumulator();

  for (const rawLine of lines) {
    if (isCommentOrEmpty(rawLine)) {
      continue;
    }

    const indent = getIndentLevel(rawLine);
    const trimmed = rawLine.trim();

    maybeExitBlocksOnIndent(indent, state);

    if (isServiceStart(trimmed)) {
      parseServiceStart(trimmed, acc, state);
      continue;
    }

    if (state.inInterfacesArray && trimmed.startsWith(ARRAY_ITEM_PREFIX)) {
      handleNewInterfaceItem(trimmed, indent, acc, state);
      continue;
    }

    if (state.inDependenciesArray) {
      const asItem = parseArrayItem(trimmed);
      if (asItem !== null) {
        handleDependenciesArrayItem(trimmed, indent, acc, state);
        continue;
      }
    }

    const kv = parseKeyValue(trimmed);
    if (!kv) {
      continue;
    }

    if (
      state.inInterfacesArray &&
      acc.currentInterface &&
      indent > state.interfaceArrayIndent
    ) {
      handleInterfaceKeyValue(kv.key, kv.value, indent, acc, state);
      continue;
    }

    if (acc.currentService) {
      handleServiceKeyValue(kv.key, kv.value, indent, acc, state);
    }
  }

  finishCurrentService(acc, state);

  return {
    services: acc.services,
  };
}

/**
 * Validates that data matches the expected service schema
 *
 * @param data - Data to validate
 * @returns Validation result with error message if invalid
 */
export function validateSchema(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "YAML must be an object" };
  }

  const dataObj = data as Record<string, unknown>;

  if (!Array.isArray(dataObj.services)) {
    return { valid: false, error: 'Missing "services" array' };
  }

  for (let i = 0; i < dataObj.services.length; i++) {
    const service = dataObj.services[i];
    if (!service || typeof service !== "object") {
      return {
        valid: false,
        error: `Service at index ${i} is not a valid object`,
      };
    }

    const serviceObj = service as Record<string, unknown>;

    if (typeof serviceObj.name !== "string" || serviceObj.name.length === 0) {
      return {
        valid: false,
        error: `Service at index ${i} is missing required field: name`,
      };
    }

    if (typeof serviceObj.owner !== "string" || serviceObj.owner.length === 0) {
      return {
        valid: false,
        error: `Service "${serviceObj.name}" is missing required field: owner`,
      };
    }

    if (serviceObj.interfaces !== undefined) {
      if (!Array.isArray(serviceObj.interfaces)) {
        return {
          valid: false,
          error: `Service "${serviceObj.name}" interfaces must be an array`,
        };
      }

      for (let j = 0; j < serviceObj.interfaces.length; j++) {
        const iface = serviceObj.interfaces[j];
        if (!iface || typeof iface !== "object") {
          return {
            valid: false,
            error: `Service "${serviceObj.name}" interface at index ${j} is not a valid object`,
          };
        }

        const ifaceObj = iface as Record<string, unknown>;

        if (
          typeof ifaceObj.domain !== "string" ||
          ifaceObj.domain.length === 0
        ) {
          return {
            valid: false,
            error: `Service "${serviceObj.name}" interface at index ${j} is missing required field: domain`,
          };
        }

        if (ifaceObj.env !== undefined && typeof ifaceObj.env === "string") {
          const env = ifaceObj.env.toLowerCase() as EnvironmentType;
          if (!VALID_ENV_TYPES.has(env)) {
            return {
              valid: false,
              error: `Service "${serviceObj.name}" interface "${ifaceObj.domain}" has invalid env. Must be one of: ${Array.from(VALID_ENV_TYPES).join(", ")}`,
            };
          }
        }

        if (ifaceObj.runtime !== undefined && ifaceObj.runtime !== null) {
          if (typeof ifaceObj.runtime !== "object") {
            return {
              valid: false,
              error: `Service "${serviceObj.name}" interface "${ifaceObj.domain}" runtime must be an object`,
            };
          }

          const runtimeObj = ifaceObj.runtime as Record<string, unknown>;

          if (
            runtimeObj.type !== undefined &&
            (typeof runtimeObj.type !== "string" ||
              !VALID_RUNTIME_TYPES.has(runtimeObj.type as RuntimeType))
          ) {
            return {
              valid: false,
              error: `Service "${serviceObj.name}" interface "${ifaceObj.domain}" has invalid runtime.type. Must be one of: ${Array.from(VALID_RUNTIME_TYPES).join(", ")}`,
            };
          }

          if (
            runtimeObj.id !== undefined &&
            typeof runtimeObj.id !== "string"
          ) {
            return {
              valid: false,
              error: `Service "${serviceObj.name}" interface "${ifaceObj.domain}" runtime.id must be a string`,
            };
          }
        }
      }
    }
  }

  return { valid: true };
}
