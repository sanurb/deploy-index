"use client";

import { useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import type { Source } from "@/lib/source-identifier";
import { hydrateDraftAtom, sourceAtom } from "@/lib/state/draft-atoms";

interface HydrateDraftsProps {
  readonly initialSource: Source;
  readonly initialContent: string;
  readonly children: React.ReactNode;
}

export function HydrateDrafts({
  initialSource,
  initialContent,
  children,
}: HydrateDraftsProps) {
  const [isReady, setIsReady] = useState(false);
  const hasHydratedRef = useRef(false);
  const setSource = useSetAtom(sourceAtom);
  const hydrateDraft = useSetAtom(hydrateDraftAtom);

  useEffect(() => {
    if (hasHydratedRef.current) {
      return;
    }

    let mounted = true;

    async function hydrate() {
      if (!mounted || hasHydratedRef.current) {
        return;
      }

      setSource(initialSource);
      await hydrateDraft(initialContent);
      hasHydratedRef.current = true;

      if (mounted) {
        setIsReady(true);
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, [initialSource.key, setSource, hydrateDraft, initialContent]);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
