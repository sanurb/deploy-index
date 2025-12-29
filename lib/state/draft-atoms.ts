import { atom } from "jotai"
import type { Source } from "@/lib/source-identifier"
import { loadDraft, saveDraft } from "@/lib/storage/draft-storage"
import { createDraft } from "@/lib/draft-schema"
import { cleanupOldDrafts } from "@/lib/storage/lru-cleanup"
import { parseYaml } from "@/lib/yaml-utils"

export const sourceAtom = atom<Source>({
  kind: "inline",
  key: "inline:default",
})

export const contentAtom = atom<string>("")

export const lastSavedAtAtom = atom<number | null>(null)

export const hydrateDraftAtom = atom(
  null,
  async (get, set, fallbackContent?: string) => {
    const source = get(sourceAtom)
    const currentContent = get(contentAtom)
    const draft = await loadDraft(source.key)

    if (draft) {
      set(contentAtom, draft.content)
    } else if (currentContent === "" && fallbackContent) {
      set(contentAtom, fallbackContent)
    }
  },
)

export const persistDraftAtom = atom(
  null,
  async (get, set) => {
    const source = get(sourceAtom)
    const content = get(contentAtom)

    try {
      const draft = createDraft(source.key, content)
      await saveDraft(draft)
      await cleanupOldDrafts(source.key)
      set(lastSavedAtAtom, Date.now())
    } catch {
      // Fail silently - persistence failures should not impact editing
    }
  },
)

export const switchSourceAtom = atom(
  null,
  async (get, set, nextSource: Source) => {
    await set(persistDraftAtom)
    set(sourceAtom, nextSource)
    await set(hydrateDraftAtom)
  },
)

export const parsedYamlAtom = atom((get) => {
  const content = get(contentAtom)
  try {
    return parseYaml(content)
  } catch {
    return null
  }
})
