import type { Draft } from "@/lib/draft-schema"
import { getItem, setItem, removeItem, getKeys } from "./indexeddb-adapter"
import { safeValidateDraft } from "@/lib/draft-schema"

const DRAFT_KEY_PREFIX = "draft:"
const STORAGE_NAMESPACE = "inventory:drafts"

function getStorageKey(draftKey: string): string {
  return `${STORAGE_NAMESPACE}:${DRAFT_KEY_PREFIX}${draftKey}`
}

export async function loadDraft(key: string): Promise<Draft | null> {
  const storageKey = getStorageKey(key)
  const data = await getItem<unknown>(storageKey)

  if (data === null) {
    return null
  }

  const result = safeValidateDraft(data)
  if (!result.success) {
    await removeItem(storageKey)
    return null
  }

  return result.data
}

export async function saveDraft(draft: Draft): Promise<void> {
  const storageKey = getStorageKey(draft.key)
  await setItem(storageKey, draft)
}

export async function removeDraft(key: string): Promise<void> {
  const storageKey = getStorageKey(key)
  await removeItem(storageKey)
}

export async function getAllDraftKeys(): Promise<string[]> {
  const keys = await getKeys()
  const prefix = `${STORAGE_NAMESPACE}:${DRAFT_KEY_PREFIX}`
  return keys.filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length))
}

export async function getAllDrafts(): Promise<readonly Draft[]> {
  const draftKeys = await getAllDraftKeys()
  const drafts: Draft[] = []

  for (const key of draftKeys) {
    const draft = await loadDraft(key)
    if (draft) {
      drafts.push(draft)
    }
  }

  return drafts.sort((a, b) => b.updatedAt - a.updatedAt)
}
