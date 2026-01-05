"use client";

import type { OnMount } from "@monaco-editor/react";
import { useAtomValue, useSetAtom } from "jotai";
import { AlertCircle, CheckCircle, Download, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  useAutosave,
  useAutosaveFlush,
} from "@/lib/autosave/autosave-orchestrator";
import { setupYamlLanguage } from "@/lib/monaco/yaml-setup";
import { createUploadSource } from "@/lib/source-identifier";
import { contentAtom, switchSourceAtom } from "@/lib/state/draft-atoms";
import { parseYaml, validateSchema } from "@/lib/yaml-utils";
import { Spinner } from "./kibo-ui/spinner";

const Editor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[500px] items-center justify-center">
        <Spinner variant="throbber" />
      </div>
    ),
  }
);

const DEFAULT_DOWNLOAD_FILENAME = "services.yaml";
const FILE_ACCEPT_TYPES = ".yaml,.yml";
const MIN_EDITOR_HEIGHT = 500;

interface ValidationState {
  readonly valid: true;
}

interface ValidationError {
  readonly valid: false;
  readonly error: string;
}

type ValidationResult = ValidationState | ValidationError;

export function YamlEditor() {
  const { resolvedTheme } = useTheme();
  const content = useAtomValue(contentAtom);
  const setContent = useSetAtom(contentAtom);
  const switchSource = useSetAtom(switchSourceAtom);
  const [validation, setValidation] = useState<ValidationResult>({
    valid: true,
  });
  const [mounted, setMounted] = useState(false);

  useAutosave();
  useAutosaveFlush();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      const parsed = parseYaml(content);
      const validationResult = validateSchema(parsed);
      if (validationResult.valid) {
        setValidation({ valid: true });
      } else {
        setValidation({
          valid: false,
          error: validationResult.error ?? "Invalid YAML",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Invalid YAML syntax";
      setValidation({
        valid: false,
        error: errorMessage,
      });
    }
  }, [content]);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    setupYamlLanguage(monaco);
  }, []);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        setContent(value);
      }
    },
    [setContent]
  );

  const handleFileUpload = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (typeof result !== "string") {
        return;
      }

      const source = createUploadSource(file.name);
      switchSource(source);
      setContent(result);
    };
    reader.readAsText(file);
  };

  const handleDownload = (): void => {
    const blob = new Blob([content], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = DEFAULT_DOWNLOAD_FILENAME;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadClick = (): void => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = FILE_ACCEPT_TYPES;
    input.addEventListener("change", handleFileUpload);
    input.click();
  };

  const editorTheme = resolvedTheme === "dark" ? "vs-dark" : "light";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-base">YAML Editor</h2>
          <p className="text-muted-foreground text-xs">
            Edit your service inventory
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="h-8"
            onClick={handleUploadClick}
            size="sm"
            variant="outline"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload
          </Button>
          <Button
            className="h-8 bg-transparent"
            onClick={handleDownload}
            size="sm"
            variant="outline"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
        </div>
      </div>

      {validation.valid ? (
        <Alert className="border-green-200 bg-green-50 py-2 dark:border-green-900 dark:bg-green-950/50">
          <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
          <AlertDescription className="text-green-700 text-xs dark:text-green-400">
            Valid YAML
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="py-2" variant="destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">
            {validation.error}
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-md border bg-muted/30">
        {mounted ? (
          <Editor
            height={`${MIN_EDITOR_HEIGHT}px`}
            language="yaml"
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            options={{
              fontSize: 12,
              minimap: { enabled: false },
              wordWrap: "on",
              lineNumbers: "relative",
              lineNumbersMinChars: 3,
              contextmenu: false,
              overviewRulerBorder: false,
              renderValidationDecorations: "off",
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              tabSize: 2,
              insertSpaces: true,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              formatOnPaste: true,
              formatOnType: true,
            }}
            theme={editorTheme}
            value={content}
          />
        ) : null}
      </div>

      <div className="space-y-1 rounded-md bg-muted/30 p-3 text-muted-foreground text-xs">
        <div className="mb-1.5 font-semibold">Schema Reference:</div>
        <div className="space-y-0.5 font-mono text-[11px]">
          <div>
            • <span className="text-foreground">name</span>: string (required)
          </div>
          <div>
            • <span className="text-foreground">owner</span>: string (required)
          </div>
          <div>
            • <span className="text-foreground">repository</span>: URL string
          </div>
          <div>
            • <span className="text-foreground">interfaces</span>: array
            (domain, env, branch, runtime mappings)
          </div>
          <div className="ml-4">
            - <span className="text-foreground">domain</span>: string (DNS name,
            required)
          </div>
          <div className="ml-4">
            - <span className="text-foreground">env</span>: production | staging
            | development
          </div>
          <div className="ml-4">
            - <span className="text-foreground">branch</span>: string (git
            branch)
          </div>
          <div className="ml-4">
            - <span className="text-foreground">runtime</span>: object
            (optional)
          </div>
          <div className="ml-8">
            - <span className="text-foreground">type</span>: ec2 | vm | k8s |
            lambda | container | paas | unknown
          </div>
          <div className="ml-8">
            - <span className="text-foreground">id</span>: string (runtime
            identifier)
          </div>
          <div>
            • <span className="text-foreground">dependencies</span>: array of
            strings
          </div>
        </div>
      </div>
    </div>
  );
}
