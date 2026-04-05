/**
 * Image Processor for CLI
 *
 * Handles custom image inputs (SVG, PNG, ICO) and generates
 * all required favicon formats. Uses Sharp for fast image processing.
 *
 * Security features:
 * - SVG sanitization to prevent XSS
 * - URL validation to prevent SSRF
 * - File size limits
 * - Input validation
 *
 * @packageDocumentation
 * @module image-processor
 */
import type { FaviconConfig } from "../lib/types";
export interface ImageInput {
    path?: string;
    url?: string;
    buffer?: Buffer;
}
export interface FaviconAssets {
    svg: string;
    pngBase64: string;
    icoBase64: string;
    png16Base64: string;
    png32Base64: string;
    png48Base64: string;
    png64Base64: string;
    png128Base64: string;
    png192Base64: string;
    png256Base64: string;
    png512Base64: string;
    appleTouchIcon: string;
    androidIcon192: string;
    androidIcon512: string;
}
/**
 * Standard favicon resolutions for various devices and contexts
 */
export declare const FAVICON_RESOLUTIONS: {
    readonly favicon16: 16;
    readonly favicon32: 32;
    readonly favicon48: 48;
    readonly favicon64: 64;
    readonly favicon128: 128;
    readonly favicon192: 192;
    readonly favicon256: 256;
    readonly favicon512: 512;
    readonly appleTouchIcon: 180;
};
/**
 * Process image input from file path or URL
 * Returns all favicon formats needed
 *
 * @throws Error if input is invalid or processing fails
 */
export declare function processImageInput(input: ImageInput): Promise<FaviconAssets>;
/**
 * Generate favicon from text/initials configuration
 * Creates all standard resolutions for cross-device compatibility
 */
export declare function generateFaviconFromText(config: FaviconConfig): Promise<FaviconAssets>;
/**
 * Convert SVG to PNG at specified size using Sharp
 */
export declare function svgToPngNode(svg: string, size: number): Promise<string>;
/**
 * Create all favicon assets from an SVG string
 */
export declare function createFaviconAssets(svgContent: string): Promise<FaviconAssets>;
