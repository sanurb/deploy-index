import { useAtomValue, useSetAtom } from "jotai"
import { useEffect, useRef } from "react"
import { contentAtom, persistDraftAtom } from "@/lib/state/draft-atoms"
import { multiTabCoordinator } from "./multi-tab-coordinator"

const DEBOUNCE_MS = 500

export function useAutosave(): void {
  const content = useAtomValue(contentAtom)
  const persistDraft = useSetAtom(persistDraftAtom)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isForegroundRef = useRef(true)

  useEffect(() => {
    if (!multiTabCoordinator) {
      return
    }

    const unsubscribe = multiTabCoordinator.onForegroundChange((isForeground) => {
      isForegroundRef.current = isForeground
      if (!isForeground) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        persistDraft()
      }
    })

    isForegroundRef.current = multiTabCoordinator.getIsForeground()

    return unsubscribe
  }, [persistDraft])

  useEffect(() => {
    if (!isForegroundRef.current) {
      return
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      persistDraft()
      timeoutRef.current = null
    }, DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [content, persistDraft])
}

export function useAutosaveFlush(): void {
  const persistDraft = useSetAtom(persistDraftAtom)

  useEffect(() => {
    const handleBlur = (): void => {
      persistDraft()
    }

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") {
        persistDraft()
      }
    }

    const handlePageHide = (): void => {
      persistDraft()
    }

    window.addEventListener("blur", handleBlur)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", handlePageHide)

    return () => {
      window.removeEventListener("blur", handleBlur)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", handlePageHide)
    }
  }, [persistDraft])
}

