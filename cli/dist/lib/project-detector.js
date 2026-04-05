"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeProject = analyzeProject;
exports.getFaviconDestination = getFaviconDestination;
exports.getAnalysisSummary = getAnalysisSummary;
/**
 * Known favicon locations in Next.js projects
 * Order matters - we check these in priority order
 */
const FAVICON_PATHS = {
    appRouter: [
        "app/favicon.ico",
        "app/icon.ico",
        "app/icon.svg",
        "app/icon.png",
        "app/icon.tsx",
        "app/icon.jsx",
        "app/apple-icon.png",
        "app/apple-icon.tsx",
    ],
    pagesRouter: [
        "public/favicon.ico",
        "public/favicon.svg",
        "public/favicon.png",
    ],
    srcAppRouter: [
        "src/app/favicon.ico",
        "src/app/icon.ico",
        "src/app/icon.svg",
        "src/app/icon.png",
        "src/app/icon.tsx",
        "src/app/icon.jsx",
        "src/app/apple-icon.png",
    ],
};
const LAYOUT_FILES = [
    "app/layout.tsx",
    "app/layout.jsx",
    "app/layout.js",
    "src/app/layout.tsx",
    "src/app/layout.jsx",
    "src/app/layout.js",
];
const DOCUMENT_FILES = [
    "pages/_document.tsx",
    "pages/_document.jsx",
    "pages/_document.js",
    "src/pages/_document.tsx",
    "src/pages/_document.jsx",
    "src/pages/_document.js",
];
const NEXTJS_CONFIG_FILES = [
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
];
/**
 * Analyzes a repository's file tree to detect:
 * - Next.js project type (App Router, Pages Router, or Hybrid)
 * - Existing favicon locations
 * - Layout/document files to modify
 *
 * This is FAST because it uses a pre-fetched file tree
 * No additional API calls needed
 */
function analyzeProject(tree) {
    const start = performance.now();
    // Create a Set for O(1) lookups
    const pathSet = new Set(tree);
    // Check if this is a Next.js project
    const hasNextConfig = NEXTJS_CONFIG_FILES.some((f) => pathSet.has(f));
    const hasPackageJson = pathSet.has("package.json");
    if (!hasNextConfig && !hasPackageJson) {
        return {
            type: "unknown",
            faviconLocations: [],
            metadataFile: null,
            layoutFile: null,
            documentFile: null,
            hasExistingFavicon: false,
            timing: {
                treeMs: 0,
                analysisMs: performance.now() - start,
                totalMs: performance.now() - start,
            },
        };
    }
    // Detect router type by checking for app/pages directories
    const hasAppDir = tree.some((p) => p.startsWith("app/") || p.startsWith("src/app/"));
    const hasPagesDir = tree.some((p) => (p.startsWith("pages/") || p.startsWith("src/pages/")) &&
        !p.includes("api/") // Don't count API routes
    );
    // Determine project type
    let type;
    if (hasAppDir && hasPagesDir) {
        type = "hybrid";
    }
    else if (hasAppDir) {
        type = "app-router";
    }
    else if (hasPagesDir) {
        type = "pages-router";
    }
    else {
        type = "unknown";
    }
    // Find existing favicons
    const allFaviconPaths = [
        ...FAVICON_PATHS.appRouter,
        ...FAVICON_PATHS.pagesRouter,
        ...FAVICON_PATHS.srcAppRouter,
    ];
    const faviconLocations = allFaviconPaths.filter((p) => pathSet.has(p));
    // Find layout file (for App Router)
    const layoutFile = LAYOUT_FILES.find((f) => pathSet.has(f)) || null;
    // Find _document file (for Pages Router)
    const documentFile = DOCUMENT_FILES.find((f) => pathSet.has(f)) || null;
    // Determine primary metadata file based on project type
    let metadataFile = null;
    if (type === "app-router" || type === "hybrid") {
        metadataFile = layoutFile;
    }
    else if (type === "pages-router") {
        metadataFile = documentFile;
    }
    const analysisMs = performance.now() - start;
    return {
        type,
        faviconLocations,
        metadataFile,
        layoutFile,
        documentFile,
        hasExistingFavicon: faviconLocations.length > 0,
        timing: {
            treeMs: 0, // Will be set by caller
            analysisMs,
            totalMs: analysisMs,
        },
    };
}
/**
 * Determines the best location to place the favicon
 * based on the project structure
 */
function getFaviconDestination(analysis) {
    if (analysis.type === "app-router" || analysis.type === "hybrid") {
        // Check if project uses src/ directory
        if (analysis.layoutFile?.startsWith("src/")) {
            return {
                iconPath: "src/app/icon.svg",
                icoPath: "src/app/favicon.ico",
                pngPath: "src/app/icon.png",
            };
        }
        return {
            iconPath: "app/icon.svg",
            icoPath: "app/favicon.ico",
            pngPath: "app/icon.png",
        };
    }
    // Pages router - use public directory
    return {
        iconPath: "public/favicon.svg",
        icoPath: "public/favicon.ico",
        pngPath: "public/favicon.png",
    };
}
/**
 * Returns a human-readable summary of the analysis
 */
function getAnalysisSummary(analysis) {
    const parts = [];
    switch (analysis.type) {
        case "app-router":
            parts.push("App Router detected");
            break;
        case "pages-router":
            parts.push("Pages Router detected");
            break;
        case "hybrid":
            parts.push("Hybrid (App + Pages) detected");
            break;
        default:
            parts.push("Project type unknown");
    }
    if (analysis.hasExistingFavicon) {
        parts.push(`${analysis.faviconLocations.length} existing favicon(s)`);
    }
    else {
        parts.push("No existing favicon");
    }
    return parts.join(" | ");
}
