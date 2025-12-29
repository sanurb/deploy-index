export type Source =
  | { readonly kind: "inline"; readonly key: "inline:default" }
  | { readonly kind: "github"; readonly key: string; readonly url: string }
  | { readonly kind: "upload"; readonly key: string; readonly filename: string }

const INLINE_KEY = "inline:default"
const GITHUB_PREFIX = "github:"
const UPLOAD_PREFIX = "upload:"

export function normalizeGitHubUrl(url: string): string {
  if (url.includes("github.com") && !url.includes("raw.githubusercontent.com")) {
    return url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")
  }
  return url
}

export function createInlineSource(): Source {
  return {
    kind: "inline",
    key: INLINE_KEY,
  }
}

export function createUploadSource(filename: string): Source {
  const key = `${UPLOAD_PREFIX}${Date.now()}-${filename}`
  return {
    kind: "upload",
    key,
    filename,
  }
}

export function createGitHubSource(url: string): Source {
  const normalizedUrl = normalizeGitHubUrl(url)
  const key = `${GITHUB_PREFIX}${normalizedUrl}`
  return {
    kind: "github",
    key,
    url,
  }
}
