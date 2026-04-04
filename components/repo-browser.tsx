"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Lock, Globe, GitBranch, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  fetchRepositories,
  fetchRepositoryTree,
  type BrowserOctokit,
} from "@/lib/github-browser";
import { analyzeProject, getAnalysisSummary } from "@/lib/project-detector";
import type { Repository, ProjectAnalysis, GitHubUser } from "@/lib/types";

interface RepoBrowserProps {
  octokit: BrowserOctokit;
  user: GitHubUser;
  onRepoSelected: (
    repo: Repository,
    analysis: ProjectAnalysis,
    timing: { fetch: number; tree: number; analysis: number }
  ) => void;
}

export function RepoBrowser({ octokit, user, onRepoSelected }: RepoBrowserProps) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<Repository[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState<number | null>(null);
  const [fetchTime, setFetchTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch repositories on mount
  useEffect(() => {
    async function loadRepos() {
      try {
        const result = await fetchRepositories(octokit);
        setRepositories(result.repos);
        setFilteredRepos(result.repos);
        setFetchTime(result.timing);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch repositories");
      } finally {
        setIsLoading(false);
      }
    }
    loadRepos();
  }, [octokit]);

  // Filter repositories based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRepos(repositories);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        repo.full_name.toLowerCase().includes(query)
    );
    setFilteredRepos(filtered);
  }, [searchQuery, repositories]);

  const handleSelectRepo = useCallback(
    async (repo: Repository) => {
      setIsAnalyzing(repo.id);
      setError(null);

      try {
        // Fetch the full tree in one API call
        const treeResult = await fetchRepositoryTree(
          octokit,
          repo.owner.login,
          repo.name
        );

        // Analyze the project structure (pure computation, very fast)
        const analysis = analyzeProject(treeResult.tree);
        analysis.timing.treeMs = treeResult.timing;
        analysis.timing.totalMs = treeResult.timing + analysis.timing.analysisMs;

        onRepoSelected(repo, analysis, {
          fetch: fetchTime || 0,
          tree: treeResult.timing,
          analysis: analysis.timing.analysisMs,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to analyze repository");
        setIsAnalyzing(null);
      }
    },
    [octokit, fetchTime, onRepoSelected]
  );

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Spinner className="size-6" />
            <p className="text-sm text-muted-foreground">Loading repositories...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <img
            src={user.avatar_url}
            alt={user.login}
            className="size-8 rounded-full"
          />
          <span>Select Repository</span>
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>
            {repositories.length} repositories found
            {fetchTime && (
              <span className="ml-2 text-xs">
                (fetched in {fetchTime.toFixed(0)}ms)
              </span>
            )}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {error}
          </div>
        )}

        <ScrollArea className="h-[400px] rounded-md border">
          <div className="flex flex-col">
            {filteredRepos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>No repositories found</p>
                {searchQuery && (
                  <p className="text-sm">Try a different search term</p>
                )}
              </div>
            ) : (
              filteredRepos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => handleSelectRepo(repo)}
                  disabled={isAnalyzing !== null}
                  className="flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0 disabled:opacity-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{repo.name}</span>
                      {repo.private ? (
                        <Lock className="size-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <Globe className="size-3.5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <GitBranch className="size-3" />
                        {repo.default_branch}
                      </span>
                      <span>{repo.owner.login}</span>
                    </div>
                  </div>
                  {isAnalyzing === repo.id ? (
                    <Spinner className="size-4 shrink-0" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
