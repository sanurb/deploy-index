export function parseYaml(yamlString: string): any {
  // Simple YAML parser for basic structures
  // In production, you'd use a library like js-yaml, but keeping it dependency-free

  try {
    const lines = yamlString.split("\n")
    const result: any = { services: [] }
    let currentService: any = null
    let currentArray: string[] = []
    let inArray = false
    let arrayKey = ""

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) continue

      // Detect new service
      if (trimmed.startsWith("- name:") || (trimmed.startsWith("- ") && trimmed.includes("name:"))) {
        if (currentService) {
          if (inArray && currentArray.length > 0) {
            currentService[arrayKey] = currentArray
            currentArray = []
            inArray = false
          }
          result.services.push(currentService)
        }
        currentService = {}
        const nameMatch = trimmed.match(/name:\s*["']?(.+?)["']?$/)
        if (nameMatch) {
          currentService.name = nameMatch[1].replace(/["']/g, "")
        }
        continue
      }

      if (!currentService) continue

      // Handle array items
      if (trimmed.startsWith("- ") && inArray) {
        const item = trimmed.substring(2).replace(/["']/g, "")
        currentArray.push(item)
        continue
      }

      // Handle key-value pairs
      const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/)
      if (kvMatch) {
        const [, key, value] = kvMatch

        // Check if it's an array start
        if (value.trim() === "" || value.trim() === "[") {
          inArray = true
          arrayKey = key
          currentArray = []
        } else if (value.startsWith("[") && value.endsWith("]")) {
          // Inline array
          currentService[key] = value
            .slice(1, -1)
            .split(",")
            .map((item) => item.trim().replace(/["']/g, ""))
        } else {
          if (inArray && currentArray.length > 0) {
            currentService[arrayKey] = currentArray
            currentArray = []
            inArray = false
          }
          currentService[key] = value.replace(/["']/g, "")
        }
      }
    }

    // Add last service
    if (currentService) {
      if (inArray && currentArray.length > 0) {
        currentService[arrayKey] = currentArray
      }
      result.services.push(currentService)
    }

    return result
  } catch (error) {
    throw new Error("Failed to parse YAML: " + (error instanceof Error ? error.message : "Unknown error"))
  }
}

export function validateSchema(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "YAML must be an object" }
  }

  if (!Array.isArray(data.services)) {
    return { valid: false, error: 'Missing "services" array' }
  }

  for (let i = 0; i < data.services.length; i++) {
    const service = data.services[i]

    if (!service.name) {
      return { valid: false, error: `Service at index ${i} is missing required field: name` }
    }

    if (!service.owner) {
      return { valid: false, error: `Service "${service.name}" is missing required field: owner` }
    }

    if (service.interfaces) {
      if (!Array.isArray(service.interfaces)) {
        return { valid: false, error: `Service "${service.name}" interfaces must be an array` }
      }

      for (let j = 0; j < service.interfaces.length; j++) {
        const iface = service.interfaces[j]

        if (!iface.domain) {
          return {
            valid: false,
            error: `Service "${service.name}" interface at index ${j} is missing required field: domain`,
          }
        }

        const validEnvs = ["production", "staging", "development"]
        if (iface.env && !validEnvs.includes(iface.env.toLowerCase())) {
          return {
            valid: false,
            error: `Service "${service.name}" interface "${iface.domain}" has invalid env. Must be one of: ${validEnvs.join(", ")}`,
          }
        }
      }
    }
  }

  return { valid: true }
}
