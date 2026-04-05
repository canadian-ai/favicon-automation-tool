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

import { readFile, stat } from "fs/promises";
import { extname, resolve } from "path";
import sharp from "sharp";
import type { FaviconConfig } from "../lib/types";
import { sanitizeSvg, validateUrl, MAX_IMAGE_SIZE, MAX_SVG_SIZE, safeErrorMessage } from "../lib/security";

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
  appleTouchIcon: string; // 180x180
  androidIcon192: string; // 192x192
  androidIcon512: string; // 512x512
}

/**
 * Standard favicon resolutions for various devices and contexts
 */
export const FAVICON_RESOLUTIONS = {
  favicon16: 16,    // Classic favicon
  favicon32: 32,    // Modern browsers
  favicon48: 48,    // Windows site icon
  favicon64: 64,    // Windows site icon (high DPI)
  favicon128: 128,  // Chrome Web Store
  favicon192: 192,  // Android Chrome
  favicon256: 256,  // Windows 8/10 tile
  favicon512: 512,  // PWA splash screen
  appleTouchIcon: 180, // Apple touch icon
} as const;

/**
 * Process image input from file path or URL
 * Returns all favicon formats needed
 * 
 * @throws Error if input is invalid or processing fails
 */
export async function processImageInput(input: ImageInput): Promise<FaviconAssets> {
  let buffer: Buffer;
  let isSvg = false;

  if (input.path) {
    const absolutePath = resolve(process.cwd(), input.path);
    
    // Check file size before reading
    const stats = await stat(absolutePath);
    const maxSize = absolutePath.toLowerCase().endsWith('.svg') ? MAX_SVG_SIZE : MAX_IMAGE_SIZE;
    if (stats.size > maxSize) {
      throw new Error(`File exceeds maximum size of ${maxSize / 1024 / 1024}MB`);
    }
    
    buffer = await readFile(absolutePath);
    isSvg = extname(input.path).toLowerCase() === ".svg";
  } else if (input.url) {
    // Validate URL to prevent SSRF
    const safeUrl = validateUrl(input.url);
    if (!safeUrl) {
      throw new Error("Invalid or disallowed URL. Only HTTPS URLs to public hosts are allowed.");
    }
    
    const response = await fetch(safeUrl, {
      headers: {
        'User-Agent': 'FaviconManager/1.0 (+https://github.com/canadian-ai/favicon-automation-tool)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${response.status} ${response.statusText}`);
    }
    
    // Check content length
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
      throw new Error(`Remote file exceeds maximum size of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    
    // Double-check actual size
    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new Error(`Downloaded file exceeds maximum size of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
    }
    
    isSvg = input.url.toLowerCase().includes(".svg") || 
            response.headers.get('content-type')?.includes('svg') || false;
  } else if (input.buffer) {
    buffer = input.buffer;
  } else {
    throw new Error("Must provide path, url, or buffer");
  }

  try {
    if (isSvg) {
      return await processSvgInput(buffer);
    } else {
      return await processRasterInput(buffer);
    }
  } catch (error) {
    throw new Error(`Image processing failed: ${safeErrorMessage(error)}`);
  }
}

/**
 * Process SVG input - sanitize, keep SVG, generate all PNG resolutions
 */
async function processSvgInput(buffer: Buffer): Promise<FaviconAssets> {
  const rawSvgContent = buffer.toString("utf-8");
  
  // Sanitize SVG for security
  const sanitizeResult = sanitizeSvg(rawSvgContent);
  if (sanitizeResult.warnings.length > 0) {
    console.warn('SVG sanitization warnings:', sanitizeResult.warnings);
  }
  
  const svgContent = sanitizeResult.sanitized;
  const sanitizedBuffer = Buffer.from(svgContent);
  
  // Generate all resolutions in parallel
  const resizeOptions = { fit: "contain" as const, background: { r: 0, g: 0, b: 0, alpha: 0 } };
  
  const [
    png16, png32, png48, png64, png128, png192, png256, png512, appleTouchIcon
  ] = await Promise.all([
    sharp(sanitizedBuffer).resize(16, 16, resizeOptions).png().toBuffer(),
    sharp(sanitizedBuffer).resize(32, 32, resizeOptions).png().toBuffer(),
    sharp(sanitizedBuffer).resize(48, 48, resizeOptions).png().toBuffer(),
    sharp(sanitizedBuffer).resize(64, 64, resizeOptions).png().toBuffer(),
    sharp(sanitizedBuffer).resize(128, 128, resizeOptions).png().toBuffer(),
    sharp(sanitizedBuffer).resize(192, 192, resizeOptions).png().toBuffer(),
    sharp(sanitizedBuffer).resize(256, 256, resizeOptions).png().toBuffer(),
    sharp(sanitizedBuffer).resize(512, 512, resizeOptions).png().toBuffer(),
    sharp(sanitizedBuffer).resize(180, 180, resizeOptions).png().toBuffer(),
  ]);

  return {
    svg: svgContent,
    pngBase64: png192.toString("base64"),
    icoBase64: png32.toString("base64"),
    png16Base64: png16.toString("base64"),
    png32Base64: png32.toString("base64"),
    png48Base64: png48.toString("base64"),
    png64Base64: png64.toString("base64"),
    png128Base64: png128.toString("base64"),
    png192Base64: png192.toString("base64"),
    png256Base64: png256.toString("base64"),
    png512Base64: png512.toString("base64"),
    appleTouchIcon: appleTouchIcon.toString("base64"),
    androidIcon192: png192.toString("base64"),
    androidIcon512: png512.toString("base64"),
  };
}

/**
 * Process raster image (PNG, JPG, etc) - generate all resolutions
 */
async function processRasterInput(buffer: Buffer): Promise<FaviconAssets> {
  const resizeOptions = { fit: "contain" as const, background: { r: 0, g: 0, b: 0, alpha: 0 } };
  
  // Generate all resolutions in parallel
  const [
    png16, png32, png48, png64, png128, png192, png256, png512, appleTouchIcon
  ] = await Promise.all([
    sharp(buffer).resize(16, 16, resizeOptions).png().toBuffer(),
    sharp(buffer).resize(32, 32, resizeOptions).png().toBuffer(),
    sharp(buffer).resize(48, 48, resizeOptions).png().toBuffer(),
    sharp(buffer).resize(64, 64, resizeOptions).png().toBuffer(),
    sharp(buffer).resize(128, 128, resizeOptions).png().toBuffer(),
    sharp(buffer).resize(192, 192, resizeOptions).png().toBuffer(),
    sharp(buffer).resize(256, 256, resizeOptions).png().toBuffer(),
    sharp(buffer).resize(512, 512, resizeOptions).png().toBuffer(),
    sharp(buffer).resize(180, 180, resizeOptions).png().toBuffer(),
  ]);

  // Generate SVG wrapper for the image (as data URL embedded)
  const svgContent = createSvgWrapper(png192);

  return {
    svg: svgContent,
    pngBase64: png192.toString("base64"),
    icoBase64: png32.toString("base64"),
    png16Base64: png16.toString("base64"),
    png32Base64: png32.toString("base64"),
    png48Base64: png48.toString("base64"),
    png64Base64: png64.toString("base64"),
    png128Base64: png128.toString("base64"),
    png192Base64: png192.toString("base64"),
    png256Base64: png256.toString("base64"),
    png512Base64: png512.toString("base64"),
    appleTouchIcon: appleTouchIcon.toString("base64"),
    androidIcon192: png192.toString("base64"),
    androidIcon512: png512.toString("base64"),
  };
}

/**
 * Create an SVG wrapper that embeds a PNG
 */
function createSvgWrapper(pngBuffer: Buffer): string {
  const base64 = pngBuffer.toString("base64");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <image width="192" height="192" href="data:image/png;base64,${base64}"/>
</svg>`;
}

/**
 * Generate favicon from text/initials configuration
 * Creates all standard resolutions for cross-device compatibility
 */
export async function generateFaviconFromText(config: FaviconConfig): Promise<FaviconAssets> {
  const svg = generateTextSvg(config);
  const svgBuffer = Buffer.from(svg);

  // Generate all resolutions in parallel
  const [
    png16, png32, png48, png64, png128, png192, png256, png512, appleTouchIcon
  ] = await Promise.all([
    sharp(svgBuffer).resize(16, 16).png().toBuffer(),
    sharp(svgBuffer).resize(32, 32).png().toBuffer(),
    sharp(svgBuffer).resize(48, 48).png().toBuffer(),
    sharp(svgBuffer).resize(64, 64).png().toBuffer(),
    sharp(svgBuffer).resize(128, 128).png().toBuffer(),
    sharp(svgBuffer).resize(192, 192).png().toBuffer(),
    sharp(svgBuffer).resize(256, 256).png().toBuffer(),
    sharp(svgBuffer).resize(512, 512).png().toBuffer(),
    sharp(svgBuffer).resize(180, 180).png().toBuffer(),
  ]);

  return {
    svg,
    pngBase64: png192.toString("base64"),
    icoBase64: png32.toString("base64"),
    png16Base64: png16.toString("base64"),
    png32Base64: png32.toString("base64"),
    png48Base64: png48.toString("base64"),
    png64Base64: png64.toString("base64"),
    png128Base64: png128.toString("base64"),
    png192Base64: png192.toString("base64"),
    png256Base64: png256.toString("base64"),
    png512Base64: png512.toString("base64"),
    appleTouchIcon: appleTouchIcon.toString("base64"),
    androidIcon192: png192.toString("base64"),
    androidIcon512: png512.toString("base64"),
  };
}

/**
 * Generate SVG from text configuration
 */
function generateTextSvg(config: FaviconConfig): string {
  const { text, backgroundColor, textColor, fontFamily, shape } = config;
  
  let rx = "0";
  if (shape === "circle") {
    rx = "50";
  } else if (shape === "rounded") {
    rx = "20";
  }
  
  const displayText = text.substring(0, 2).toUpperCase();
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
 * Convert SVG to PNG at specified size using Sharp
 */
export async function svgToPngNode(svg: string, size: number): Promise<string> {
  const buffer = Buffer.from(svg);
  const png = await sharp(buffer)
    .resize(size, size)
    .png()
    .toBuffer();
  return png.toString("base64");
}

/**
 * Create all favicon assets from an SVG string
 */
export async function createFaviconAssets(svgContent: string): Promise<FaviconAssets> {
  const svgBuffer = Buffer.from(svgContent);

  const [png32, png192] = await Promise.all([
    sharp(svgBuffer).resize(32, 32).png().toBuffer(),
    sharp(svgBuffer).resize(192, 192).png().toBuffer(),
  ]);

  return {
    svg: svgContent,
    pngBase64: png192.toString("base64"),
    icoBase64: png32.toString("base64"),
  };
}
