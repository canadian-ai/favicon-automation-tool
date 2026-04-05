import type { TransformResult } from "./types";
/**
 * Transforms a Next.js App Router layout.tsx to add favicon metadata
 * Uses recast for precise AST manipulation that preserves formatting
 *
 * This is FAST: ~10-50ms for typical layout files
 */
export declare function transformLayoutMetadata(sourceCode: string, faviconPath: string): TransformResult;
/**
 * Transforms a Next.js Pages Router _document.tsx to add favicon link
 * Finds the <Head> component and adds a link element
 */
export declare function transformDocumentHead(sourceCode: string, faviconPath: string): TransformResult;
/**
 * Determines if the code needs transformation based on project type
 * Returns the appropriate transformer function
 */
export declare function getTransformer(projectType: "app-router" | "pages-router" | "hybrid" | "unknown"): {
    transform: (code: string, faviconPath: string) => TransformResult;
    fileType: "layout" | "document";
} | null;
/**
 * Validates that a transformation was successful
 * Quick syntax check using recast
 */
export declare function validateTransformation(code: string): boolean;
