import type { StorageValue } from "unstorage"
import { createStorage } from "unstorage"
import indexedDbDriver from "unstorage/drivers/indexedb"

const STORAGE_DB_NAME = "yaml-editor-drafts"
const STORAGE_STORE_NAME = "drafts"

export const storage = createStorage({
  driver: indexedDbDriver({
    base: STORAGE_STORE_NAME,
    dbName: STORAGE_DB_NAME,
  }),
})

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = await storage.getItem(key)
    return value as T | null
  } catch {
    return null
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await storage.setItem(key, value as StorageValue)
  } catch {
    // Fail silently - persistence failures should not impact editing
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await storage.removeItem(key)
  } catch {
    // Fail silently
  }
}

export async function getKeys(): Promise<string[]> {
  try {
    return await storage.getKeys()
  } catch {
    return []
  }
}

export async function clear(): Promise<void> {
  try {
    await storage.clear()
  } catch {
    // Fail silently
  }
}

