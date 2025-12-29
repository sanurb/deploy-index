import { getAllDrafts, removeDraft } from "./draft-storage"
import type { Draft } from "@/lib/draft-schema"

const MAX_DRAFTS = 50
const MAX_TOTAL_SIZE_BYTES = 10 * 1024 * 1024

function estimateDraftSize(draft: Draft): number {
  return JSON.stringify(draft).length
}

export async function cleanupOldDrafts(excludeKey?: string): Promise<void> {
  const drafts = await getAllDrafts()

  if (drafts.length <= MAX_DRAFTS) {
    const totalSize = drafts.reduce((sum, draft) => sum + estimateDraftSize(draft), 0)
    if (totalSize <= MAX_TOTAL_SIZE_BYTES) {
      return
    }
  }

  const sortedDrafts = drafts
    .filter((draft) => draft.key !== excludeKey)
    .sort((a, b) => a.updatedAt - b.updatedAt)

  let currentSize = drafts
    .filter((draft) => draft.key === excludeKey)
    .reduce((sum, draft) => sum + estimateDraftSize(draft), 0)

  const toRemove: Draft[] = []

  for (const draft of sortedDrafts) {
    if (toRemove.length >= drafts.length - MAX_DRAFTS) {
      break
    }

    const draftSize = estimateDraftSize(draft)
    if (currentSize + draftSize > MAX_TOTAL_SIZE_BYTES) {
      toRemove.push(draft)
    } else {
      currentSize += draftSize
    }
  }

  for (const draft of toRemove) {
    await removeDraft(draft.key)
  }
}
