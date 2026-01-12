"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { AlertCircle, Link, Loader2 } from "lucide-react";
import { useState } from "react";
import { ServiceTable } from "@/components/service-table/index";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createGitHubSource,
  normalizeGitHubUrl,
} from "@/lib/source-identifier";
import { contentAtom, switchSourceAtom } from "@/lib/state/draft-atoms";

export function UrlViewer() {
  const [url, setUrl] = useState("");
  const yamlContent = useAtomValue(contentAtom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const switchSource = useSetAtom(switchSourceAtom);
  const setContent = useSetAtom(contentAtom);

  const fetchYamlFromUrl = async () => {
    if (!url) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const source = createGitHubSource(url);
      await switchSource(source);

      const normalizedUrl = normalizeGitHubUrl(url);
      const response = await fetch(normalizedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const content = await response.text();
      setContent(content);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch YAML file"
      );
    } finally {
      setLoading(false);
    }
  };

  const exampleUrls = [
    "https://raw.githubusercontent.com/yourorg/services/main/inventory.yaml",
    "https://gist.githubusercontent.com/username/abc123/raw/services.yaml",
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <h2 className="font-semibold text-base">URL Viewer</h2>
          <p className="text-muted-foreground text-xs">
            Paste a GitHub raw URL to instantly visualize services
          </p>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              className="h-9 text-sm"
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchYamlFromUrl()}
              placeholder="https://raw.githubusercontent.com/org/repo/main/services.yaml"
              value={url}
            />
          </div>
          <Button
            className="h-9 bg-transparent"
            disabled={loading || !url}
            onClick={fetchYamlFromUrl}
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Loading
              </>
            ) : (
              <>
                <Link className="mr-1.5 h-3.5 w-3.5" />
                Load
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert className="py-2" variant="destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <div className="font-medium text-muted-foreground text-xs">
            Example URLs:
          </div>
          {exampleUrls.map((exampleUrl, i) => (
            <div className="text-xs" key={i}>
              <button
                className="font-mono text-[11px] text-primary hover:underline"
                onClick={() => setUrl(exampleUrl)}
              >
                {exampleUrl}
              </button>
            </div>
          ))}
        </div>

        <Alert className="py-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">
            <strong>Pro tip:</strong> Share this page with{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
              ?url=...
            </code>{" "}
            for instant, shareable inventories
          </AlertDescription>
        </Alert>
      </div>

      {yamlContent && (
        <div className="border-t pt-4">
          <ServiceTable initialSearchQuery="" yamlContent={yamlContent} />
        </div>
      )}
    </div>
  );
}
