/**
 * Image Processor for CLI
 * 
 * Handles custom image inputs (SVG, PNG, ICO) and generates
 * all required favicon formats. Uses Sharp for fast image processing.
 */

import { readFile } from "fs/promises";
import { extname, resolve } from "path";
import sharp from "sharp";
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
}

/**
 * Process image input from file path or URL
 * Returns all favicon formats needed
 */
export async function processImageInput(input: ImageInput): Promise<FaviconAssets> {
  let buffer: Buffer;
  let isSvg = false;

  if (input.path) {
    const absolutePath = resolve(process.cwd(), input.path);
    buffer = await readFile(absolutePath);
    isSvg = extname(input.path).toLowerCase() === ".svg";
  } else if (input.url) {
    const response = await fetch(input.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    isSvg = input.url.toLowerCase().includes(".svg");
  } else if (input.buffer) {
    buffer = input.buffer;
  } else {
    throw new Error("Must provide path, url, or buffer");
  }

  if (isSvg) {
    return processSvgInput(buffer);
  } else {
    return processRasterInput(buffer);
  }
}

/**
 * Process SVG input - keep original SVG, generate PNG variants
 */
async function processSvgInput(buffer: Buffer): Promise<FaviconAssets> {
  const svgContent = buffer.toString("utf-8");
  
  // Generate PNG at 32px for ICO-compatible use
  const png32 = await sharp(buffer)
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Generate main PNG at 192px
  const png192 = await sharp(buffer)
    .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return {
    svg: svgContent,
    pngBase64: png192.toString("base64"),
    icoBase64: png32.toString("base64"), // Using PNG as ICO-compatible
  };
}

/**
 * Process raster image (PNG, JPG, etc) - generate all formats
 */
async function processRasterInput(buffer: Buffer): Promise<FaviconAssets> {
  // Generate PNG at different sizes
  const png32 = await sharp(buffer)
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const png192 = await sharp(buffer)
    .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Generate SVG wrapper for the image (as data URL embedded)
  const svgContent = createSvgWrapper(png192);

  return {
    svg: svgContent,
    pngBase64: png192.toString("base64"),
    icoBase64: png32.toString("base64"),
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
 */
export async function generateFaviconFromText(config: FaviconConfig): Promise<FaviconAssets> {
  const svg = generateTextSvg(config);
  const svgBuffer = Buffer.from(svg);

  // Generate PNG variants
  const png32 = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer();

  const png192 = await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toBuffer();

  return {
    svg,
    pngBase64: png192.toString("base64"),
    icoBase64: png32.toString("base64"),
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
