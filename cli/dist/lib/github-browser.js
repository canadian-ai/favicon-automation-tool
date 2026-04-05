"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBrowserClient = createBrowserClient;
exports.validateToken = validateToken;
exports.fetchRepositories = fetchRepositories;
exports.fetchRepositoryTree = fetchRepositoryTree;
exports.fetchFileContent = fetchFileContent;
exports.createFaviconPR = createFaviconPR;
const core_1 = require("@octokit/core");
const octokit_plugin_create_pull_request_1 = require("octokit-plugin-create-pull-request");
// Create custom Octokit with PR plugin
const MyOctokit = core_1.Octokit.plugin(octokit_plugin_create_pull_request_1.createPullRequest);
/**
 * Creates an Octokit client that works entirely in the browser
 * using the user's Personal Access Token
 */
function createBrowserClient(token) {
    return new MyOctokit({ auth: token });
}
/**
 * Validates the token and returns user information
 * This is fast - single API call
 */
async function validateToken(octokit) {
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
    }
    catch (error) {
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
 * Returns repos sorted by most recently pushed
 */
async function fetchRepositories(octokit, options = {}) {
    const start = performance.now();
    const { perPage = 100, type = "all" } = options;
    const { data } = await octokit.request("GET /user/repos", {
        per_page: perPage,
        type,
        sort: "pushed",
        direction: "desc",
    });
    const repos = data.map((repo) => ({
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
 * This is our speed advantage - one call gets everything
 */
async function fetchRepositoryTree(octokit, owner, repo, branch) {
    const start = performance.now();
    // First get the default branch if not specified
    let treeSha = branch || "HEAD";
    if (!branch) {
        const { data: repoData } = await octokit.request("GET /repos/{owner}/{repo}", {
            owner,
            repo,
        });
        treeSha = repoData.default_branch;
    }
    // Get the full tree in one call (recursive)
    const { data } = await octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
        owner,
        repo,
        tree_sha: treeSha,
        recursive: "true",
    });
    const paths = data.tree
        .filter((item) => item.type === "blob")
        .map((item) => item.path);
    return {
        tree: paths,
        timing: performance.now() - start,
    };
}
/**
 * Fetches file content from a repository
 */
async function fetchFileContent(octokit, owner, repo, path) {
    const start = performance.now();
    const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
        owner,
        repo,
        path,
    });
    if (Array.isArray(data) || data.type !== "file" || !data.content) {
        throw new Error(`Path ${path} is not a file`);
    }
    // Decode base64 content
    const content = atob(data.content.replace(/\n/g, ""));
    return {
        content,
        sha: data.sha,
        timing: performance.now() - start,
    };
}
/**
 * Creates a pull request with all file changes in a single atomic operation
 * This is the key to our speed - branch + commit + PR in one call
 */
async function createFaviconPR(octokit, params) {
    const start = performance.now();
    const { owner, repo, baseBranch, changes, title, body } = params;
    // Prepare files object for the PR plugin
    const files = {};
    for (const change of changes) {
        if (change.encoding === "base64") {
            files[change.path] = { content: change.content, encoding: "base64" };
        }
        else {
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
        body: body ||
            generatePRBody(changes),
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
function generatePRBody(changes) {
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
    body += `---
*Generated in the browser using deterministic AST transformations for maximum speed.*`;
    return body;
}
