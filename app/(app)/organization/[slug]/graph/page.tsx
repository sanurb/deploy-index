"use client";

import { AuthUIContext } from "@daveyplate/better-auth-ui";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CameraControllerHandle } from "@/components/dependency-graph/camera-controller";
import type { GraphSearchHandle } from "@/components/dependency-graph/graph-search";
import { useGraphKeyboard } from "@/components/dependency-graph/use-graph-keyboard";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphQueryState } from "@/hooks/use-graph-query-state";
import { db } from "@/lib/db";
import type { FocusRef } from "@/types/graph";

// Dynamic imports to avoid SSR issues with Three.js
const GraphCanvas = dynamic(
  () =>
    import("@/components/dependency-graph/graph-canvas").then(
      (m) => m.GraphCanvas
    ),
  { ssr: false }
);

const BlastPanel = dynamic(
  () =>
    import("@/components/dependency-graph/blast-panel").then(
      (m) => m.BlastPanel
    ),
  { ssr: false }
);

const GraphSearch = dynamic(
  () =>
    import("@/components/dependency-graph/graph-search").then(
      (m) => m.GraphSearch
    ),
  { ssr: false }
);

function GraphPageContent() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  // Resolve organization
  const authUIContext = useContext(AuthUIContext);
  const orgListResult = authUIContext?.hooks?.useListOrganizations?.();
  const apiOrgList = orgListResult?.data ?? null;

  const organizationFromApi = useMemo(() => {
    if (!slug || !apiOrgList || !Array.isArray(apiOrgList)) return null;
    for (const item of apiOrgList as Array<
      | { slug?: string; id?: string; name?: string }
      | { organization?: { slug?: string; id?: string; name?: string } }
    >) {
      const orgSlug =
        "organization" in item && item.organization?.slug != null
          ? item.organization.slug
          : "slug" in item && item.slug != null
            ? item.slug
            : null;
      if (orgSlug != null && String(orgSlug) === String(slug)) {
        return ("organization" in item ? item.organization : item) as {
          id: string;
          name?: string;
          slug: string;
        };
      }
    }
    return null;
  }, [slug, apiOrgList]);

  const { data: orgData } = db.useQuery(
    slug && !organizationFromApi
      ? { organizations: { $: { where: { slug } } } }
      : null
  );

  const organizationFromDb = Array.isArray(orgData?.organizations)
    ? (orgData.organizations[0] ?? null)
    : null;

  const organization = organizationFromApi ?? organizationFromDb;
  const organizationId =
    organization?.id && typeof organization.id === "string"
      ? organization.id
      : null;
  const orgName = (organization as { name?: string })?.name ?? slug;

  // State
  const queryState = useGraphQueryState();
  const {
    focusKind,
    focusId,
    hops,
    selected,
    view,
    setFocus,
    setHops,
    setSelected,
    clearSelected,
    setView,
    hasFocus,
  } = queryState;

  const { data, layout, isLoading, error, isTruncated } = useGraphData({
    organizationId: organizationId ?? "",
    focusKind,
    focusId,
    hops,
  });

  const [hoveredNodeId, setHoveredNodeId] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const searchRef = useRef<GraphSearchHandle>(null);
  const cameraRef = useRef<CameraControllerHandle>(null);

  const handleSearchSelect = useCallback(
    (ref: FocusRef) => {
      setFocus(ref.kind, ref.id);
    },
    [setFocus]
  );

  const handleReduceHops = useCallback(() => {
    setHops(2);
  }, [setHops]);

  // Keyboard controls
  useGraphKeyboard({
    nodes: data?.nodes ?? [],
    positions: layout?.positions ?? [],
    focusNodeId: data?.focusNodeId ?? "",
    selectedNodeId: selected,
    view,
    hops,
    setSelected,
    clearSelected,
    setView,
    setHops,
    searchRef,
    cameraRef,
  });

  // Panel visibility
  const showPanel = hasFocus && data && layout;

  return (
    <div className="flex h-full flex-col bg-[#05070B]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-2">
        <GraphSearch
          onFocusChange={setSearchFocused}
          onSelect={handleSearchSelect}
          organizationId={organizationId ?? ""}
          ref={searchRef}
        />
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {hasFocus && (
            <>
              <span>Hops: {hops}</span>
              <span className="text-slate-700">|</span>
              <span>{view.toUpperCase()}</span>
            </>
          )}
          {data && (
            <>
              <span className="text-slate-700">|</span>
              <span>{data.meta.subgraphSize} nodes</span>
            </>
          )}
        </div>
        <div className="ml-auto text-xs text-slate-600">
          <kbd className="rounded border border-slate-700 px-1">/</kbd> search
          <span className="mx-1.5">·</span>
          <kbd className="rounded border border-slate-700 px-1">Tab</kbd> cycle
          <span className="mx-1.5">·</span>
          <kbd className="rounded border border-slate-700 px-1">v</kbd> 2D/3D
        </div>
      </div>

      {/* Main content */}
      <div className="relative flex-1">
        {/* Empty state */}
        {!hasFocus && !isLoading && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="max-w-sm">
              <h2 className="text-lg font-semibold text-slate-200">
                Dependency Graph
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Search for a service, domain, or dependency to explore its blast
                radius and understand impact across your organization.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin text-slate-500" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-red-400">{error}</p>
            <p className="mt-1 text-xs text-slate-500">
              Try a different search or reduce the hop depth.
            </p>
          </div>
        )}

        {/* Graph with panel — Desktop */}
        {data && layout && !isLoading && !error && (
          <>
            {/* Desktop: resizable split */}
            <div className="hidden h-full lg:block">
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={showPanel ? 65 : 100}>
                  <div
                    className={`h-full ${searchFocused ? "" : "ring-1 ring-slate-700/50"}`}
                  >
                    <GraphCanvas
                      cameraRef={cameraRef}
                      data={data}
                      hops={hops}
                      hoveredNodeId={hoveredNodeId}
                      layout={layout}
                      onHover={setHoveredNodeId}
                      onSelect={setSelected}
                      selectedNodeId={selected}
                      view={view}
                    />
                  </div>
                </ResizablePanel>
                {showPanel && (
                  <>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={35} minSize={25}>
                      <BlastPanel
                        data={data}
                        onReduceHops={handleReduceHops}
                        onSelect={setSelected}
                        orgName={orgName}
                        selectedNodeId={selected}
                        slug={slug}
                      />
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </div>

            {/* Mobile: full canvas + bottom sheet */}
            <div className="block h-full lg:hidden">
              <GraphCanvas
                cameraRef={cameraRef}
                data={data}
                hops={hops}
                hoveredNodeId={hoveredNodeId}
                layout={layout}
                onHover={setHoveredNodeId}
                onSelect={setSelected}
                selectedNodeId={selected}
                view={view}
              />
              {showPanel && (
                <Sheet
                  onOpenChange={(open) => {
                    if (!open) clearSelected();
                  }}
                  open={Boolean(selected)}
                >
                  <SheetContent className="bg-[#05070B] p-0" side="bottom">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Blast Radius Details</SheetTitle>
                    </SheetHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                      <BlastPanel
                        data={data}
                        onReduceHops={handleReduceHops}
                        onSelect={setSelected}
                        orgName={orgName}
                        selectedNodeId={selected}
                        slug={slug}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-[#05070B]">
          <Loader2 className="size-6 animate-spin text-slate-500" />
        </div>
      }
    >
      <GraphPageContent />
    </Suspense>
  );
}
