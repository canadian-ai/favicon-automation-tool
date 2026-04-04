import type { FaviconConfig, GeneratedFavicon } from "./types";

/**
 * Generates an SVG favicon from text/initials
 * This is instant - pure string generation
 */
export function generateTextFavicon(config: FaviconConfig): string {
  const { text, backgroundColor, textColor, fontFamily, shape } = config;
  
  // Calculate border radius based on shape
  let rx = "0";
  if (shape === "circle") {
    rx = "50";
  } else if (shape === "rounded") {
    rx = "20";
  }
  
  // Use first 2 characters
  const displayText = text.substring(0, 2).toUpperCase();
  
  // Calculate font size based on text length
  const fontSize = displayText.length === 1 ? 60 : 48;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" rx="${rx}" fill="${backgroundColor}"/>
  <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
        font-family="${fontFamily}" font-size="${fontSize}" font-weight="600"
        fill="${textColor}">${escapeXml(displayText)}</text>
</svg>`;
}

/**
 * Escape special characters for XML
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Converts SVG to PNG at specified size using Canvas API
 * Works entirely in the browser
 */
export async function svgToPng(
  svg: string,
  size: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      // Get base64 without the data URL prefix
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      resolve(base64);
    };
    
    img.onerror = () => {
      reject(new Error("Failed to load SVG"));
    };
    
    // Create blob URL from SVG
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    img.src = URL.createObjectURL(svgBlob);
  });
}

/**
 * Converts SVG to ICO format
 * ICO is basically a PNG in a wrapper for 32x32
 */
export async function svgToIco(svg: string): Promise<string> {
  // For simplicity, we create a 32x32 PNG and treat it as ICO-compatible
  // Modern browsers handle PNG favicons fine
  return svgToPng(svg, 32);
}

/**
 * Generates all favicon formats from an SVG
 * Returns base64 encoded strings for each format
 */
export async function generateAllFormats(
  config: FaviconConfig
): Promise<GeneratedFavicon> {
  const svg = generateTextFavicon(config);
  
  // Generate all sizes in parallel
  const [icoBase64, png32Base64, png192Base64, png512Base64] = await Promise.all([
    svgToIco(svg),
    svgToPng(svg, 32),
    svgToPng(svg, 192),
    svgToPng(svg, 512),
  ]);
  
  return {
    svg,
    icoBase64,
    png32Base64,
    png192Base64,
    png512Base64,
  };
}

/**
 * Creates a data URL from SVG for preview
 */
export function svgToDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Creates a PNG data URL from base64
 */
export function pngBase64ToDataUrl(base64: string): string {
  return `data:image/png;base64,${base64}`;
}

/**
 * Preset color combinations for quick selection
 */
export const COLOR_PRESETS = [
  { name: "Blue", bg: "#3B82F6", text: "#FFFFFF" },
  { name: "Green", bg: "#10B981", text: "#FFFFFF" },
  { name: "Purple", bg: "#8B5CF6", text: "#FFFFFF" },
  { name: "Red", bg: "#EF4444", text: "#FFFFFF" },
  { name: "Orange", bg: "#F97316", text: "#FFFFFF" },
  { name: "Pink", bg: "#EC4899", text: "#FFFFFF" },
  { name: "Teal", bg: "#14B8A6", text: "#FFFFFF" },
  { name: "Slate", bg: "#1E293B", text: "#FFFFFF" },
  { name: "Black", bg: "#000000", text: "#FFFFFF" },
  { name: "White", bg: "#FFFFFF", text: "#000000" },
] as const;

/**
 * Available font families for favicon text
 */
export const FONT_PRESETS = [
  { name: "Inter", value: "Inter, system-ui, sans-serif" },
  { name: "System", value: "system-ui, sans-serif" },
  { name: "Mono", value: "ui-monospace, monospace" },
  { name: "Serif", value: "Georgia, serif" },
] as const;
