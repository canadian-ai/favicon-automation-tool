import type { ProjectAnalysis } from "./types";
/**
 * Analyzes a repository's file tree to detect:
 * - Next.js project type (App Router, Pages Router, or Hybrid)
 * - Existing favicon locations
 * - Layout/document files to modify
 *
 * This is FAST because it uses a pre-fetched file tree
 * No additional API calls needed
 */
export declare function analyzeProject(tree: string[]): ProjectAnalysis;
/**
 * Determines the best location to place the favicon
 * based on the project structure
 */
export declare function getFaviconDestination(analysis: ProjectAnalysis): {
    iconPath: string;
    icoPath: string;
    pngPath: string;
};
/**
 * Returns a human-readable summary of the analysis
 */
export declare function getAnalysisSummary(analysis: ProjectAnalysis): string;
