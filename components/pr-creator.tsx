"use client";

import { useState } from "react";
import {
  FileIcon,
  FileCode,
  FilePlus,
  FileEdit,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  createFaviconPR,
  fetchFileContent,
  type BrowserOctokit,
} from "@/lib/github-browser";
import { getFaviconDestination } from "@/lib/project-detector";
import { transformLayoutMetadata, transformDocumentHead } from "@/lib/ast-transformer";
import type {
  Repository,
  ProjectAnalysis,
  GeneratedFavicon,
  FileChange,
  PRResult,
} from "@/lib/types";

interface PRCreatorProps {
  octokit: BrowserOctokit;
  repo: Repository;
  analysis: ProjectAnalysis;
  favicon: GeneratedFavicon;
  onPRCreated: (result: PRResult, changes: FileChange[]) => void;
  onBack: () => void;
}

export function PRCreator({
  octokit,
  repo,
  analysis,
  favicon,
  onPRCreated,
  onBack,
}: PRCreatorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [timing, setTiming] = useState<{
    fetch?: number;
    transform?: number;
    pr?: number;
    total?: number;
  }>({});

  // Calculate what files will be changed
  const destination = getFaviconDestination(analysis);
  
  const plannedChanges: FileChange[] = [
    {
      path: destination.iconPath,
      content: favicon.svg,
      action: analysis.faviconLocations.includes(destination.iconPath)
        ? "update"
        : "create",
    },
    {
      path: destination.icoPath,
      content: favicon.icoBase64,
      encoding: "base64",
      action: analysis.faviconLocations.includes(destination.icoPath)
        ? "update"
        : "create",
    },
  ];

  // Add layout/document file if applicable
  if (analysis.layoutFile && (analysis.type === "app-router" || analysis.type === "hybrid")) {
    plannedChanges.push({
      path: analysis.layoutFile,
      content: "", // Will be filled during creation
      action: "update",
    });
  }

  const handleCreatePR = async () => {
    setIsCreating(true);
    setError(null);
    const startTotal = performance.now();

    try {
      const finalChanges: FileChange[] = [];
      
      // Add favicon files
      finalChanges.push({
        path: destination.iconPath,
        content: favicon.svg,
        action: analysis.faviconLocations.includes(destination.iconPath)
          ? "update"
          : "create",
      });
      
      finalChanges.push({
        path: destination.icoPath,
        content: favicon.icoBase64,
        encoding: "base64",
        action: analysis.faviconLocations.includes(destination.icoPath)
          ? "update"
          : "create",
      });

      // Handle layout file transformation for App Router
      if (analysis.layoutFile && (analysis.type === "app-router" || analysis.type === "hybrid")) {
        setStatus("Fetching layout file...");
        const startFetch = performance.now();
        
        const layoutContent = await fetchFileContent(
          octokit,
          repo.owner.login,
          repo.name,
          analysis.layoutFile
        );
        
        setTiming((t) => ({ ...t, fetch: performance.now() - startFetch }));
        setStatus("Transforming metadata...");
        const startTransform = performance.now();
        
        // Determine the correct favicon path for metadata
        const faviconRef = destination.iconPath.startsWith("src/app/")
          ? "/" + destination.iconPath.replace("src/app/", "")
          : "/" + destination.iconPath.replace("app/", "");
        
        const result = transformLayoutMetadata(layoutContent.content, faviconRef);
        
        setTiming((t) => ({ ...t, transform: performance.now() - startTransform }));
        
        if (result.changed) {
          finalChanges.push({
            path: analysis.layoutFile,
            content: result.code,
            action: "update",
          });
        }
      }

      // Handle _document file for Pages Router
      if (analysis.documentFile && analysis.type === "pages-router") {
        setStatus("Fetching _document file...");
        const startFetch = performance.now();
        
        const docContent = await fetchFileContent(
          octokit,
          repo.owner.login,
          repo.name,
          analysis.documentFile
        );
        
        setTiming((t) => ({ ...t, fetch: performance.now() - startFetch }));
        setStatus("Transforming head...");
        const startTransform = performance.now();
        
        const faviconRef = "/" + destination.iconPath.replace("public/", "");
        const result = transformDocumentHead(docContent.content, faviconRef);
        
        setTiming((t) => ({ ...t, transform: performance.now() - startTransform }));
        
        if (result.changed) {
          finalChanges.push({
            path: analysis.documentFile,
            content: result.code,
            action: "update",
          });
        }
      }

      // Create the PR
      setStatus("Creating pull request...");
      const startPR = performance.now();
      
      const prResult = await createFaviconPR(octokit, {
        owner: repo.owner.login,
        repo: repo.name,
        baseBranch: repo.default_branch,
        changes: finalChanges,
        title: "Add favicon",
        body: generatePRBody(finalChanges, timing),
      });
      
      const prTime = performance.now() - startPR;
      const totalTime = performance.now() - startTotal;
      
      setTiming((t) => ({ ...t, pr: prTime, total: totalTime }));
      
      onPRCreated(
        { ...prResult, timing: totalTime },
        finalChanges
      );
    } catch (err) {
      console.error("PR creation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to create PR");
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <FileCode className="size-5" />
          Review Changes
        </CardTitle>
        <CardDescription>
          These files will be created or modified in{" "}
          <span className="font-medium">{repo.full_name}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* File changes list */}
        <ScrollArea className="h-[200px] rounded-md border">
          <div className="flex flex-col divide-y">
            {plannedChanges.map((change) => (
              <div
                key={change.path}
                className="flex items-center gap-3 p-3"
              >
                {change.action === "create" ? (
                  <FilePlus className="size-4 text-green-600 shrink-0" />
                ) : (
                  <FileEdit className="size-4 text-amber-600 shrink-0" />
                )}
                <span className="font-mono text-sm flex-1 truncate">
                  {change.path}
                </span>
                <Badge variant={change.action === "create" ? "default" : "secondary"}>
                  {change.action}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Speed indicator */}
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
          <Zap className="size-4 text-amber-500" />
          <span className="text-sm">
            Deterministic AST transformation - no AI latency
          </span>
        </div>

        {/* Timing display */}
        {(timing.fetch || timing.transform || timing.pr) && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {timing.fetch && (
              <span>Fetch: {timing.fetch.toFixed(0)}ms</span>
            )}
            {timing.transform && (
              <span>Transform: {timing.transform.toFixed(0)}ms</span>
            )}
            {timing.pr && (
              <span>PR Creation: {timing.pr.toFixed(0)}ms</span>
            )}
            {timing.total && (
              <span className="font-medium text-foreground">
                Total: {timing.total.toFixed(0)}ms
              </span>
            )}
          </div>
        )}

        {/* Status */}
        {status && isCreating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            {status}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isCreating}>
          Back
        </Button>
        <Button
          onClick={handleCreatePR}
          disabled={isCreating}
          className="flex-1"
        >
          {isCreating ? (
            <>
              <Spinner className="size-4" />
              Creating PR...
            </>
          ) : (
            "Create Pull Request"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function generatePRBody(
  changes: FileChange[],
  timing: { fetch?: number; transform?: number; pr?: number; total?: number }
): string {
  const creates = changes.filter((c) => c.action === "create");
  const updates = changes.filter((c) => c.action === "update");

  let body = `## Favicon Update

This PR was automatically created by **Favicon Manager**.

### Changes

`;

  if (creates.length > 0) {
    body += `**New files:**\n`;
    creates.forEach((c) => {
      body += `- \`${c.path}\`\n`;
    });
    body += "\n";
  }

  if (updates.length > 0) {
    body += `**Modified files:**\n`;
    updates.forEach((c) => {
      body += `- \`${c.path}\`\n`;
    });
    body += "\n";
  }

  if (timing.total) {
    body += `### Performance

| Step | Time |
|------|------|
${timing.fetch ? `| Fetch files | ${timing.fetch.toFixed(0)}ms |\n` : ""}${timing.transform ? `| AST Transform | ${timing.transform.toFixed(0)}ms |\n` : ""}${timing.pr ? `| Create PR | ${timing.pr.toFixed(0)}ms |\n` : ""}| **Total** | **${timing.total.toFixed(0)}ms** |

`;
  }

  body += `---
*Generated using deterministic AST transformations for maximum speed.*`;

  return body;
}

// Success view component
export function PRSuccess({
  result,
  changes,
  onReset,
}: {
  result: PRResult;
  changes: FileChange[];
  onReset: () => void;
}) {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-green-600">
          <CheckCircle2 className="size-6" />
          Pull Request Created
        </CardTitle>
        <CardDescription>
          Your favicon has been added to the repository
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 p-4 rounded-md bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="font-medium">{result.title}</span>
            <Badge>#{result.number}</Badge>
          </div>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-4"
          >
            View on GitHub
            <ExternalLink className="size-3.5" />
          </a>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400">
          <Zap className="size-4" />
          <span className="text-sm font-medium">
            Completed in {result.timing.toFixed(0)}ms
          </span>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Files changed: {changes.length}</p>
          <ul className="mt-1 ml-4 list-disc">
            {changes.map((c) => (
              <li key={c.path} className="font-mono text-xs">
                {c.path}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onReset} variant="outline" className="w-full">
          Create Another Favicon
        </Button>
      </CardFooter>
    </Card>
  );
}
