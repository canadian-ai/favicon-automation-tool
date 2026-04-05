import type { FaviconConfig, GeneratedFavicon } from "./types";
/**
 * Generates an SVG favicon from text/initials
 * This is instant - pure string generation
 */
export declare function generateTextFavicon(config: FaviconConfig): string;
/**
 * Converts SVG to PNG at specified size using Canvas API
 * Works entirely in the browser
 */
export declare function svgToPng(svg: string, size: number): Promise<string>;
/**
 * Converts SVG to ICO format
 * ICO is basically a PNG in a wrapper for 32x32
 */
export declare function svgToIco(svg: string): Promise<string>;
/**
 * Generates all favicon formats from an SVG
 * Returns base64 encoded strings for each format
 */
export declare function generateAllFormats(config: FaviconConfig): Promise<GeneratedFavicon>;
/**
 * Creates a data URL from SVG for preview
 */
export declare function svgToDataUrl(svg: string): string;
/**
 * Creates a PNG data URL from base64
 */
export declare function pngBase64ToDataUrl(base64: string): string;
/**
 * Preset color combinations for quick selection
 */
export declare const COLOR_PRESETS: readonly [{
    readonly name: "Blue";
    readonly bg: "#3B82F6";
    readonly text: "#FFFFFF";
}, {
    readonly name: "Green";
    readonly bg: "#10B981";
    readonly text: "#FFFFFF";
}, {
    readonly name: "Purple";
    readonly bg: "#8B5CF6";
    readonly text: "#FFFFFF";
}, {
    readonly name: "Red";
    readonly bg: "#EF4444";
    readonly text: "#FFFFFF";
}, {
    readonly name: "Orange";
    readonly bg: "#F97316";
    readonly text: "#FFFFFF";
}, {
    readonly name: "Pink";
    readonly bg: "#EC4899";
    readonly text: "#FFFFFF";
}, {
    readonly name: "Teal";
    readonly bg: "#14B8A6";
    readonly text: "#FFFFFF";
}, {
    readonly name: "Slate";
    readonly bg: "#1E293B";
    readonly text: "#FFFFFF";
}, {
    readonly name: "Black";
    readonly bg: "#000000";
    readonly text: "#FFFFFF";
}, {
    readonly name: "White";
    readonly bg: "#FFFFFF";
    readonly text: "#000000";
}];
/**
 * Available font families for favicon text
 */
export declare const FONT_PRESETS: readonly [{
    readonly name: "Inter";
    readonly value: "Inter, system-ui, sans-serif";
}, {
    readonly name: "System";
    readonly value: "system-ui, sans-serif";
}, {
    readonly name: "Mono";
    readonly value: "ui-monospace, monospace";
}, {
    readonly name: "Serif";
    readonly value: "Georgia, serif";
}];
