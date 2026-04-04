/**
 * Node.js GitHub client
 * 
 * Mirrors the browser client but with Node.js-specific optimizations.
 * Uses the same Octokit plugin for atomic PR creation.
 */

import { Octokit } from "@octokit/core";
import { createPullRequest } from "octokit-plugin-create-pull-request";
import type { GitHubUser, Repository, FileChange, PRResult } from "../lib/types";

// Create custom Octokit with PR plugin
const MyOctokit = Octokit.plugin(createPullRequest);

export type NodeOctokit = InstanceType<typeof MyOctokit>;

/**
 * Creates an Octokit client for Node.js environment
 */
export function createNodeClient(token: string): NodeOctokit {
  return new MyOctokit({ 
    auth: token,
    userAgent: "favicon-manager-cli/1.0.0",
  });
}

/**
 * Validates the token and returns user information
 */
export async function validateTokenNode(
  octokit: NodeOctokit
): Promise<{ valid: boolean; user?: GitHubUser; error?: string; timing: number }> {
  const start = performance.now();
  
  try {
    const { data } = await octokit.request("GET /user");
    return {
      valid: true,
      user: {
        login: data.login,
        avatar_url: data.avatar_url,
        name: data.name,
      },
      timing: performance.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid token";
    return {
      valid: false,
      error: message.includes("401") ? "Invalid or expired token" : message,
      timing: performance.now() - start,
    };
  }
}

/**
 * Fetches repositories accessible to the user
 */
export async function fetchRepositoriesNode(
  octokit: NodeOctokit,
  options: { perPage?: number; type?: "all" | "owner" | "member" } = {}
): Promise<{ repos: Repository[]; timing: number }> {
  const start = performance.now();
  const { perPage = 100, type = "all" } = options;

  const { data } = await octokit.request("GET /user/repos", {
    per_page: perPage,
    type,
    sort: "pushed",
    direction: "desc",
  });

  const repos: Repository[] = data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    owner: {
      login: repo.owner.login,
      avatar_url: repo.owner.avatar_url,
    },
    default_branch: repo.default_branch,
    private: repo.private,
  }));

  return {
    repos,
    timing: performance.now() - start,
  };
}

/**
 * Fetches the full tree of a repository in a single API call
 */
export async function fetchRepositoryTreeNode(
  octokit: NodeOctokit,
  owner: string,
  repo: string,
  branch?: string
): Promise<{ tree: string[]; timing: number }> {
  const start = performance.now();

  let treeSha = branch || "HEAD";
  
  if (!branch) {
    const { data: repoData } = await octokit.request("GET /repos/{owner}/{repo}", {
      owner,
      repo,
    });
    treeSha = repoData.default_branch;
  }

  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    {
      owner,
      repo,
      tree_sha: treeSha,
      recursive: "true",
    }
  );

  const paths = data.tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path as string);

  return {
    tree: paths,
    timing: performance.now() - start,
  };
}

/**
 * Fetches file content from a repository
 */
export async function fetchFileContentNode(
  octokit: NodeOctokit,
  owner: string,
  repo: string,
  path: string
): Promise<{ content: string; sha: string; timing: number }> {
  const start = performance.now();

  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner,
      repo,
      path,
    }
  );

  if (Array.isArray(data) || data.type !== "file" || !data.content) {
    throw new Error(`Path ${path} is not a file`);
  }

  // Decode base64 content
  const content = Buffer.from(data.content, "base64").toString("utf-8");

  return {
    content,
    sha: data.sha,
    timing: performance.now() - start,
  };
}

/**
 * Creates a pull request with all file changes atomically
 */
export async function createFaviconPRNode(
  octokit: NodeOctokit,
  params: {
    owner: string;
    repo: string;
    baseBranch: string;
    changes: FileChange[];
    title?: string;
    body?: string;
  }
): Promise<PRResult> {
  const start = performance.now();

  const { owner, repo, baseBranch, changes, title, body } = params;

  // Prepare files object for the PR plugin
  const files: Record<string, string | { content: string; encoding: "base64" }> = {};

  for (const change of changes) {
    if (change.encoding === "base64") {
      files[change.path] = { content: change.content, encoding: "base64" };
    } else {
      files[change.path] = change.content;
    }
  }

  // Generate unique branch name
  const branchName = `favicon-${Date.now()}`;

  // Create PR with all changes atomically
  const pr = await octokit.createPullRequest({
    owner,
    repo,
    title: title || "Add favicon",
    body: body || generatePRBody(changes),
    head: branchName,
    base: baseBranch,
    changes: [
      {
        files,
        commit: "Add favicon assets and update metadata",
      },
    ],
  });

  if (!pr || !pr.data) {
    throw new Error("Failed to create pull request");
  }

  return {
    url: pr.data.html_url,
    number: pr.data.number,
    title: pr.data.title,
    timing: performance.now() - start,
  };
}

/**
 * Generates a descriptive PR body
 */
function generatePRBody(changes: FileChange[]): string {
  const creates = changes.filter((c) => c.action === "create");
  const updates = changes.filter((c) => c.action === "update");

  let body = `## Favicon Update

This PR was automatically created by **Favicon Manager CLI**.

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

  body += `---
*Generated using deterministic AST transformations for maximum speed.*`;

  return body;
}
