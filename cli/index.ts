#!/usr/bin/env node
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

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { createNodeClient, validateTokenNode, fetchRepositoriesNode, fetchRepositoryTreeNode, fetchFileContentNode, createFaviconPRNode } from "./github-node";
import { analyzeProject, getFaviconDestination } from "../lib/project-detector";
import { transformLayoutMetadata, transformDocumentHead, getTransformer } from "../lib/ast-transformer";
import { processImageInput, generateFaviconFromText, svgToPngNode, createFaviconAssets } from "./image-processor";
import type { CLIOptions, CLIResult, FileChange, FaviconConfig } from "../lib/types";

const program = new Command();

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
  .action(async (repo: string, options) => {
    const token = options.token || process.env.GITHUB_TOKEN;
    const output = options.output as "json" | "text";
    const isJson = output === "json";

    if (!token) {
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: "GitHub token required. Use --token or set GITHUB_TOKEN env." }));
      } else {
        console.error(chalk.red("Error: GitHub token required. Use --token or set GITHUB_TOKEN env."));
      }
      process.exit(1);
    }

    const [owner, repoName] = repo.split("/");
    if (!owner || !repoName) {
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: "Repository must be in owner/repo format" }));
      } else {
        console.error(chalk.red("Error: Repository must be in owner/repo format"));
      }
      process.exit(1);
    }

    const spinner = isJson ? null : ora("Connecting to GitHub...").start();
    const timings: Record<string, number> = {};
    const totalStart = performance.now();

    try {
      // Validate token
      const tokenStart = performance.now();
      const client = createNodeClient(token);
      const validation = await validateTokenNode(client);
      timings.tokenValidation = validation.timing;
      
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid token");
      }
      spinner?.text = `Authenticated as ${validation.user?.login}`;

      // Fetch repository tree
      const treeStart = performance.now();
      spinner?.text = "Fetching repository structure...";
      const { tree, timing: treeTiming } = await fetchRepositoryTreeNode(client, owner, repoName, options.branch);
      timings.treeFetch = treeTiming;

      // Analyze project
      const analysisStart = performance.now();
      spinner?.text = "Analyzing project structure...";
      const analysis = analyzeProject(tree);
      analysis.timing.treeMs = treeTiming;
      analysis.timing.totalMs = analysis.timing.analysisMs + treeTiming;
      timings.analysis = analysis.timing.analysisMs;

      timings.total = performance.now() - totalStart;
      spinner?.succeed(`Analysis complete in ${timings.total.toFixed(0)}ms`);

      const result: CLIResult = {
        success: true,
        timing: { total: timings.total, steps: timings },
        analysis,
      };

      if (isJson) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log("\n" + chalk.bold("Project Analysis:"));
        console.log(chalk.gray("─".repeat(40)));
        console.log(`  Type:              ${chalk.cyan(analysis.type)}`);
        console.log(`  Has Favicon:       ${analysis.hasExistingFavicon ? chalk.yellow("Yes") : chalk.green("No")}`);
        console.log(`  Layout File:       ${analysis.layoutFile || chalk.gray("None")}`);
        console.log(`  Document File:     ${analysis.documentFile || chalk.gray("None")}`);
        
        if (analysis.faviconLocations.length > 0) {
          console.log(`  Existing Favicons:`);
          analysis.faviconLocations.forEach(f => console.log(`    - ${f}`));
        }

        if (options.verbose) {
          console.log("\n" + chalk.bold("Timing:"));
          Object.entries(timings).forEach(([key, value]) => {
            console.log(`  ${key}: ${value.toFixed(1)}ms`);
          });
        }

        // Show destination paths
        const dest = getFaviconDestination(analysis);
        console.log("\n" + chalk.bold("Recommended Favicon Paths:"));
        console.log(`  SVG:  ${dest.iconPath}`);
        console.log(`  ICO:  ${dest.icoPath}`);
        console.log(`  PNG:  ${dest.pngPath}`);
      }

    } catch (error) {
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
  .action(async (repo: string, options) => {
    const token = options.token || process.env.GITHUB_TOKEN;
    const output = options.output as "json" | "text";
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

    const spinner = isJson ? null : ora("Starting favicon workflow...").start();
    const timings: Record<string, number> = {};
    const totalStart = performance.now();

    try {
      // Step 1: Validate token
      spinner?.text = "Validating GitHub token...";
      const tokenStart = performance.now();
      const client = createNodeClient(token);
      const validation = await validateTokenNode(client);
      timings.tokenValidation = validation.timing;

      if (!validation.valid) {
        throw new Error(validation.error || "Invalid token");
      }
      spinner?.text = `Authenticated as ${chalk.cyan(validation.user?.login)}`;

      // Step 2: Fetch and analyze repository
      spinner?.text = "Analyzing repository...";
      const { tree, timing: treeTiming } = await fetchRepositoryTreeNode(client, owner, repoName, options.branch);
      timings.treeFetch = treeTiming;

      const analysis = analyzeProject(tree);
      timings.analysis = analysis.timing.analysisMs;
      spinner?.text = `Detected: ${chalk.cyan(analysis.type)}`;

      if (analysis.type === "unknown") {
        throw new Error("Could not detect Next.js project structure");
      }

      // Step 3: Process image input
      spinner?.text = "Processing favicon image...";
      const imageStart = performance.now();
      
      let faviconAssets: { svg: string; pngBase64: string; icoBase64: string };
      
      if (options.text) {
        // Generate from text
        const config: FaviconConfig = {
          text: options.text.substring(0, 2),
          backgroundColor: options.background || "#3B82F6",
          textColor: options.color || "#FFFFFF",
          fontFamily: "Inter, system-ui, sans-serif",
          shape: (options.shape as "circle" | "square" | "rounded") || "rounded",
        };
        faviconAssets = await generateFaviconFromText(config);
      } else {
        // Process file or URL
        const imagePath = options.image || options.svg;
        const imageUrl = options.url;
        faviconAssets = await processImageInput({ path: imagePath, url: imageUrl });
      }
      
      timings.imageProcessing = performance.now() - imageStart;

      // Step 4: Determine file destinations
      const destinations = getFaviconDestination(analysis);
      const changes: FileChange[] = [];

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
      const transformer = getTransformer(analysis.type);

      if (transformer && analysis.metadataFile) {
        const { content: sourceCode } = await fetchFileContentNode(client, owner, repoName, analysis.metadataFile);
        
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

        const result: CLIResult = {
          success: true,
          timing: { total: timings.total, steps: timings },
          analysis,
          changes,
        };

        if (isJson) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log("\n" + chalk.bold("Planned Changes:"));
          console.log(chalk.gray("─".repeat(40)));
          changes.forEach(c => {
            const icon = c.action === "create" ? chalk.green("+") : chalk.yellow("~");
            const size = c.encoding === "base64" 
              ? `(${(c.content.length * 0.75 / 1024).toFixed(1)}KB)`
              : `(${c.content.length} chars)`;
            console.log(`  ${icon} ${c.path} ${chalk.gray(size)}`);
          });
          console.log("\n" + chalk.gray("Use without --dry-run to create PR"));
        }
      } else {
        spinner?.text = "Creating pull request...";
        const prStart = performance.now();

        // Get default branch
        const { data: repoData } = await client.request("GET /repos/{owner}/{repo}", { owner, repo: repoName });
        const baseBranch = options.branch || repoData.default_branch;

        const prResult = await createFaviconPRNode(client, {
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

        const result: CLIResult = {
          success: true,
          timing: { total: timings.total, steps: timings },
          analysis,
          changes,
          pr: prResult,
        };

        if (isJson) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log("\n" + chalk.bold.green("Pull Request Created:"));
          console.log(chalk.gray("─".repeat(40)));
          console.log(`  URL:    ${chalk.cyan(prResult.url)}`);
          console.log(`  Number: #${prResult.number}`);
          console.log(`  Title:  ${prResult.title}`);
          console.log("\n" + chalk.bold("Files Changed:"));
          changes.forEach(c => {
            const icon = c.action === "create" ? chalk.green("+") : chalk.yellow("~");
            console.log(`  ${icon} ${c.path}`);
          });

          if (options.verbose) {
            console.log("\n" + chalk.bold("Performance:"));
            console.log(`  Total:              ${chalk.cyan(timings.total.toFixed(0) + "ms")}`);
            Object.entries(timings).filter(([k]) => k !== "total").forEach(([key, value]) => {
              console.log(`  ${key.padEnd(18)} ${value.toFixed(0)}ms`);
            });
          }
        }
      }

    } catch (error) {
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

    const spinner = isJson ? null : ora("Fetching repositories...").start();

    try {
      const client = createNodeClient(token);
      const validation = await validateTokenNode(client);
      
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid token");
      }

      const { repos, timing } = await fetchRepositoriesNode(client, { perPage: limit });
      spinner?.succeed(`Found ${repos.length} repositories in ${timing.toFixed(0)}ms`);

      if (isJson) {
        console.log(JSON.stringify({ success: true, repos, timing }));
      } else {
        console.log("\n" + chalk.bold("Your Repositories:"));
        console.log(chalk.gray("─".repeat(50)));
        repos.forEach(repo => {
          const privacy = repo.private ? chalk.yellow("private") : chalk.green("public");
          console.log(`  ${chalk.cyan(repo.full_name)} [${privacy}]`);
        });
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      spinner?.fail(`Failed: ${message}`);
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: message }));
      }
      process.exit(1);
    }
  });

function outputError(isJson: boolean, message: string) {
  if (isJson) {
    console.log(JSON.stringify({ success: false, error: message }));
  } else {
    console.error(chalk.red(`Error: ${message}`));
  }
}

program.parse();
