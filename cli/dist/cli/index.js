#!/usr/bin/env node
"use strict";
/**
 * Favicon Manager CLI
 *
 * A fast, deterministic CLI for adding favicons to Next.js projects.
 * Designed for agent workflows with JSON output support.
 *
 * Usage:
 *   favicon-manager apply owner/repo --token <token> --svg ./icon.svg
 *   favicon-manager apply owner/repo --token <token> --text "AB" --background "#3B82F6"
 *   favicon-manager analyze owner/repo --token <token> --output json
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const github_node_1 = require("./github-node");
const project_detector_1 = require("../lib/project-detector");
const ast_transformer_1 = require("../lib/ast-transformer");
const image_processor_1 = require("./image-processor");
const program = new commander_1.Command();
program
    .name("favicon-manager")
    .description("Fast, deterministic favicon management for Next.js projects")
    .version("1.0.0");
// Analyze command - inspect a repository
program
    .command("analyze")
    .description("Analyze a Next.js repository structure")
    .argument("<repo>", "Repository in owner/repo format")
    .option("-t, --token <token>", "GitHub Personal Access Token (or set GITHUB_TOKEN env)")
    .option("-b, --branch <branch>", "Branch to analyze (defaults to default branch)")
    .option("-o, --output <format>", "Output format: json or text", "text")
    .option("-v, --verbose", "Show detailed timing information")
    .action(async (repo, options) => {
    const token = options.token || process.env.GITHUB_TOKEN;
    const output = options.output;
    const isJson = output === "json";
    if (!token) {
        if (isJson) {
            console.log(JSON.stringify({ success: false, error: "GitHub token required. Use --token or set GITHUB_TOKEN env." }));
        }
        else {
            console.error(chalk_1.default.red("Error: GitHub token required. Use --token or set GITHUB_TOKEN env."));
        }
        process.exit(1);
    }
    const [owner, repoName] = repo.split("/");
    if (!owner || !repoName) {
        if (isJson) {
            console.log(JSON.stringify({ success: false, error: "Repository must be in owner/repo format" }));
        }
        else {
            console.error(chalk_1.default.red("Error: Repository must be in owner/repo format"));
        }
        process.exit(1);
    }
    const spinner = isJson ? null : (0, ora_1.default)("Connecting to GitHub...").start();
    const timings = {};
    const totalStart = performance.now();
    try {
        // Validate token
        const tokenStart = performance.now();
        const client = (0, github_node_1.createNodeClient)(token);
        const validation = await (0, github_node_1.validateTokenNode)(client);
        timings.tokenValidation = validation.timing;
        if (!validation.valid) {
            throw new Error(validation.error || "Invalid token");
        }
        spinner?.text = `Authenticated as ${validation.user?.login}`;
        // Fetch repository tree
        const treeStart = performance.now();
        spinner?.text = "Fetching repository structure...";
        const { tree, timing: treeTiming } = await (0, github_node_1.fetchRepositoryTreeNode)(client, owner, repoName, options.branch);
        timings.treeFetch = treeTiming;
        // Analyze project
        const analysisStart = performance.now();
        spinner?.text = "Analyzing project structure...";
        const analysis = (0, project_detector_1.analyzeProject)(tree);
        analysis.timing.treeMs = treeTiming;
        analysis.timing.totalMs = analysis.timing.analysisMs + treeTiming;
        timings.analysis = analysis.timing.analysisMs;
        timings.total = performance.now() - totalStart;
        spinner?.succeed(`Analysis complete in ${timings.total.toFixed(0)}ms`);
        const result = {
            success: true,
            timing: { total: timings.total, steps: timings },
            analysis,
        };
        if (isJson) {
            console.log(JSON.stringify(result, null, 2));
        }
        else {
            console.log("\n" + chalk_1.default.bold("Project Analysis:"));
            console.log(chalk_1.default.gray("─".repeat(40)));
            console.log(`  Type:              ${chalk_1.default.cyan(analysis.type)}`);
            console.log(`  Has Favicon:       ${analysis.hasExistingFavicon ? chalk_1.default.yellow("Yes") : chalk_1.default.green("No")}`);
            console.log(`  Layout File:       ${analysis.layoutFile || chalk_1.default.gray("None")}`);
            console.log(`  Document File:     ${analysis.documentFile || chalk_1.default.gray("None")}`);
            if (analysis.faviconLocations.length > 0) {
                console.log(`  Existing Favicons:`);
                analysis.faviconLocations.forEach(f => console.log(`    - ${f}`));
            }
            if (options.verbose) {
                console.log("\n" + chalk_1.default.bold("Timing:"));
                Object.entries(timings).forEach(([key, value]) => {
                    console.log(`  ${key}: ${value.toFixed(1)}ms`);
                });
            }
            // Show destination paths
            const dest = (0, project_detector_1.getFaviconDestination)(analysis);
            console.log("\n" + chalk_1.default.bold("Recommended Favicon Paths:"));
            console.log(`  SVG:  ${dest.iconPath}`);
            console.log(`  ICO:  ${dest.icoPath}`);
            console.log(`  PNG:  ${dest.pngPath}`);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        spinner?.fail(`Analysis failed: ${message}`);
        if (isJson) {
            console.log(JSON.stringify({ success: false, error: message, timing: { total: performance.now() - totalStart, steps: timings } }));
        }
        process.exit(1);
    }
});
// Apply command - add or update favicon
program
    .command("apply")
    .description("Add or update favicon in a Next.js repository")
    .argument("<repo>", "Repository in owner/repo format")
    .option("-t, --token <token>", "GitHub Personal Access Token (or set GITHUB_TOKEN env)")
    .option("-b, --branch <branch>", "Base branch (defaults to default branch)")
    .option("-i, --image <path>", "Path to image file (PNG, ICO, or SVG)")
    .option("-s, --svg <path>", "Path to SVG file")
    .option("-u, --url <url>", "URL to image file")
    .option("--text <text>", "Generate favicon from text/initials (1-2 chars)")
    .option("--background <color>", "Background color for generated favicon", "#3B82F6")
    .option("--color <color>", "Text color for generated favicon", "#FFFFFF")
    .option("--shape <shape>", "Shape: circle, square, or rounded", "rounded")
    .option("-o, --output <format>", "Output format: json or text", "text")
    .option("-d, --dry-run", "Preview changes without creating PR")
    .option("-v, --verbose", "Show detailed information")
    .option("--title <title>", "Custom PR title")
    .option("--body <body>", "Custom PR body")
    .action(async (repo, options) => {
    const token = options.token || process.env.GITHUB_TOKEN;
    const output = options.output;
    const isJson = output === "json";
    // Validation
    if (!token) {
        outputError(isJson, "GitHub token required. Use --token or set GITHUB_TOKEN env.");
        process.exit(1);
    }
    const [owner, repoName] = repo.split("/");
    if (!owner || !repoName) {
        outputError(isJson, "Repository must be in owner/repo format");
        process.exit(1);
    }
    // Must provide image source
    const hasImageSource = options.image || options.svg || options.url || options.text;
    if (!hasImageSource) {
        outputError(isJson, "Must provide image source: --image, --svg, --url, or --text");
        process.exit(1);
    }
    const spinner = isJson ? null : (0, ora_1.default)("Starting favicon workflow...").start();
    const timings = {};
    const totalStart = performance.now();
    try {
        // Step 1: Validate token
        spinner?.text = "Validating GitHub token...";
        const tokenStart = performance.now();
        const client = (0, github_node_1.createNodeClient)(token);
        const validation = await (0, github_node_1.validateTokenNode)(client);
        timings.tokenValidation = validation.timing;
        if (!validation.valid) {
            throw new Error(validation.error || "Invalid token");
        }
        spinner?.text = `Authenticated as ${chalk_1.default.cyan(validation.user?.login)}`;
        // Step 2: Fetch and analyze repository
        spinner?.text = "Analyzing repository...";
        const { tree, timing: treeTiming } = await (0, github_node_1.fetchRepositoryTreeNode)(client, owner, repoName, options.branch);
        timings.treeFetch = treeTiming;
        const analysis = (0, project_detector_1.analyzeProject)(tree);
        timings.analysis = analysis.timing.analysisMs;
        spinner?.text = `Detected: ${chalk_1.default.cyan(analysis.type)}`;
        if (analysis.type === "unknown") {
            throw new Error("Could not detect Next.js project structure");
        }
        // Step 3: Process image input
        spinner?.text = "Processing favicon image...";
        const imageStart = performance.now();
        let faviconAssets;
        if (options.text) {
            // Generate from text
            const config = {
                text: options.text.substring(0, 2),
                backgroundColor: options.background || "#3B82F6",
                textColor: options.color || "#FFFFFF",
                fontFamily: "Inter, system-ui, sans-serif",
                shape: options.shape || "rounded",
            };
            faviconAssets = await (0, image_processor_1.generateFaviconFromText)(config);
        }
        else {
            // Process file or URL
            const imagePath = options.image || options.svg;
            const imageUrl = options.url;
            faviconAssets = await (0, image_processor_1.processImageInput)({ path: imagePath, url: imageUrl });
        }
        timings.imageProcessing = performance.now() - imageStart;
        // Step 4: Determine file destinations
        const destinations = (0, project_detector_1.getFaviconDestination)(analysis);
        const changes = [];
        // Add favicon files
        changes.push({
            path: destinations.iconPath,
            content: faviconAssets.svg,
            encoding: "utf-8",
            action: analysis.faviconLocations.includes(destinations.iconPath) ? "update" : "create",
        });
        changes.push({
            path: destinations.icoPath,
            content: faviconAssets.icoBase64,
            encoding: "base64",
            action: analysis.faviconLocations.includes(destinations.icoPath) ? "update" : "create",
        });
        changes.push({
            path: destinations.pngPath,
            content: faviconAssets.pngBase64,
            encoding: "base64",
            action: analysis.faviconLocations.includes(destinations.pngPath) ? "update" : "create",
        });
        // Step 5: Transform metadata files (AST)
        spinner?.text = "Transforming metadata files...";
        const transformStart = performance.now();
        const transformer = (0, ast_transformer_1.getTransformer)(analysis.type);
        if (transformer && analysis.metadataFile) {
            const { content: sourceCode } = await (0, github_node_1.fetchFileContentNode)(client, owner, repoName, analysis.metadataFile);
            const faviconRef = analysis.type === "pages-router"
                ? "/" + destinations.iconPath.replace(/^public\//, "")
                : "./" + destinations.iconPath.split("/").pop();
            const result = transformer.transform(sourceCode, faviconRef);
            if (result.changed) {
                changes.push({
                    path: analysis.metadataFile,
                    content: result.code,
                    encoding: "utf-8",
                    action: "update",
                });
            }
            timings.astTransform = result.timing;
        }
        timings.metadataTransform = performance.now() - transformStart;
        // Step 6: Create PR (or dry run)
        if (options.dryRun) {
            timings.total = performance.now() - totalStart;
            spinner?.succeed(`Dry run complete in ${timings.total.toFixed(0)}ms`);
            const result = {
                success: true,
                timing: { total: timings.total, steps: timings },
                analysis,
                changes,
            };
            if (isJson) {
                console.log(JSON.stringify(result, null, 2));
            }
            else {
                console.log("\n" + chalk_1.default.bold("Planned Changes:"));
                console.log(chalk_1.default.gray("─".repeat(40)));
                changes.forEach(c => {
                    const icon = c.action === "create" ? chalk_1.default.green("+") : chalk_1.default.yellow("~");
                    const size = c.encoding === "base64"
                        ? `(${(c.content.length * 0.75 / 1024).toFixed(1)}KB)`
                        : `(${c.content.length} chars)`;
                    console.log(`  ${icon} ${c.path} ${chalk_1.default.gray(size)}`);
                });
                console.log("\n" + chalk_1.default.gray("Use without --dry-run to create PR"));
            }
        }
        else {
            spinner?.text = "Creating pull request...";
            const prStart = performance.now();
            // Get default branch
            const { data: repoData } = await client.request("GET /repos/{owner}/{repo}", { owner, repo: repoName });
            const baseBranch = options.branch || repoData.default_branch;
            const prResult = await (0, github_node_1.createFaviconPRNode)(client, {
                owner,
                repo: repoName,
                baseBranch,
                changes,
                title: options.title || "Add favicon",
                body: options.body,
            });
            timings.prCreation = prResult.timing;
            timings.total = performance.now() - totalStart;
            spinner?.succeed(`PR created in ${timings.total.toFixed(0)}ms`);
            const result = {
                success: true,
                timing: { total: timings.total, steps: timings },
                analysis,
                changes,
                pr: prResult,
            };
            if (isJson) {
                console.log(JSON.stringify(result, null, 2));
            }
            else {
                console.log("\n" + chalk_1.default.bold.green("Pull Request Created:"));
                console.log(chalk_1.default.gray("─".repeat(40)));
                console.log(`  URL:    ${chalk_1.default.cyan(prResult.url)}`);
                console.log(`  Number: #${prResult.number}`);
                console.log(`  Title:  ${prResult.title}`);
                console.log("\n" + chalk_1.default.bold("Files Changed:"));
                changes.forEach(c => {
                    const icon = c.action === "create" ? chalk_1.default.green("+") : chalk_1.default.yellow("~");
                    console.log(`  ${icon} ${c.path}`);
                });
                if (options.verbose) {
                    console.log("\n" + chalk_1.default.bold("Performance:"));
                    console.log(`  Total:              ${chalk_1.default.cyan(timings.total.toFixed(0) + "ms")}`);
                    Object.entries(timings).filter(([k]) => k !== "total").forEach(([key, value]) => {
                        console.log(`  ${key.padEnd(18)} ${value.toFixed(0)}ms`);
                    });
                }
            }
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        spinner?.fail(`Failed: ${message}`);
        timings.total = performance.now() - totalStart;
        if (isJson) {
            console.log(JSON.stringify({
                success: false,
                error: message,
                timing: { total: timings.total, steps: timings }
            }));
        }
        process.exit(1);
    }
});
// List repositories command
program
    .command("list")
    .description("List accessible repositories")
    .option("-t, --token <token>", "GitHub Personal Access Token (or set GITHUB_TOKEN env)")
    .option("-o, --output <format>", "Output format: json or text", "text")
    .option("-n, --limit <number>", "Maximum repositories to list", "20")
    .action(async (options) => {
    const token = options.token || process.env.GITHUB_TOKEN;
    const isJson = options.output === "json";
    const limit = parseInt(options.limit) || 20;
    if (!token) {
        outputError(isJson, "GitHub token required. Use --token or set GITHUB_TOKEN env.");
        process.exit(1);
    }
    const spinner = isJson ? null : (0, ora_1.default)("Fetching repositories...").start();
    try {
        const client = (0, github_node_1.createNodeClient)(token);
        const validation = await (0, github_node_1.validateTokenNode)(client);
        if (!validation.valid) {
            throw new Error(validation.error || "Invalid token");
        }
        const { repos, timing } = await (0, github_node_1.fetchRepositoriesNode)(client, { perPage: limit });
        spinner?.succeed(`Found ${repos.length} repositories in ${timing.toFixed(0)}ms`);
        if (isJson) {
            console.log(JSON.stringify({ success: true, repos, timing }));
        }
        else {
            console.log("\n" + chalk_1.default.bold("Your Repositories:"));
            console.log(chalk_1.default.gray("─".repeat(50)));
            repos.forEach(repo => {
                const privacy = repo.private ? chalk_1.default.yellow("private") : chalk_1.default.green("public");
                console.log(`  ${chalk_1.default.cyan(repo.full_name)} [${privacy}]`);
            });
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        spinner?.fail(`Failed: ${message}`);
        if (isJson) {
            console.log(JSON.stringify({ success: false, error: message }));
        }
        process.exit(1);
    }
});
function outputError(isJson, message) {
    if (isJson) {
        console.log(JSON.stringify({ success: false, error: message }));
    }
    else {
        console.error(chalk_1.default.red(`Error: ${message}`));
    }
}
program.parse();
