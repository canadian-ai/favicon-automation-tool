"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAVICON_RESOLUTIONS = void 0;
exports.processImageInput = processImageInput;
exports.generateFaviconFromText = generateFaviconFromText;
exports.svgToPngNode = svgToPngNode;
exports.createFaviconAssets = createFaviconAssets;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const sharp_1 = __importDefault(require("sharp"));
const security_1 = require("../lib/security");
/**
 * Standard favicon resolutions for various devices and contexts
 */
exports.FAVICON_RESOLUTIONS = {
    favicon16: 16, // Classic favicon
    favicon32: 32, // Modern browsers
    favicon48: 48, // Windows site icon
    favicon64: 64, // Windows site icon (high DPI)
    favicon128: 128, // Chrome Web Store
    favicon192: 192, // Android Chrome
    favicon256: 256, // Windows 8/10 tile
    favicon512: 512, // PWA splash screen
    appleTouchIcon: 180, // Apple touch icon
};
/**
 * Process image input from file path or URL
 * Returns all favicon formats needed
 *
 * @throws Error if input is invalid or processing fails
 */
async function processImageInput(input) {
    let buffer;
    let isSvg = false;
    if (input.path) {
        const absolutePath = (0, path_1.resolve)(process.cwd(), input.path);
        // Check file size before reading
        const stats = await (0, promises_1.stat)(absolutePath);
        const maxSize = absolutePath.toLowerCase().endsWith('.svg') ? security_1.MAX_SVG_SIZE : security_1.MAX_IMAGE_SIZE;
        if (stats.size > maxSize) {
            throw new Error(`File exceeds maximum size of ${maxSize / 1024 / 1024}MB`);
        }
        buffer = await (0, promises_1.readFile)(absolutePath);
        isSvg = (0, path_1.extname)(input.path).toLowerCase() === ".svg";
    }
    else if (input.url) {
        // Validate URL to prevent SSRF
        const safeUrl = (0, security_1.validateUrl)(input.url);
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
        if (contentLength && parseInt(contentLength) > security_1.MAX_IMAGE_SIZE) {
            throw new Error(`Remote file exceeds maximum size of ${security_1.MAX_IMAGE_SIZE / 1024 / 1024}MB`);
        }
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        // Double-check actual size
        if (buffer.length > security_1.MAX_IMAGE_SIZE) {
            throw new Error(`Downloaded file exceeds maximum size of ${security_1.MAX_IMAGE_SIZE / 1024 / 1024}MB`);
        }
        isSvg = input.url.toLowerCase().includes(".svg") ||
            response.headers.get('content-type')?.includes('svg') || false;
    }
    else if (input.buffer) {
        buffer = input.buffer;
    }
    else {
        throw new Error("Must provide path, url, or buffer");
    }
    try {
        if (isSvg) {
            return await processSvgInput(buffer);
        }
        else {
            return await processRasterInput(buffer);
        }
    }
    catch (error) {
        throw new Error(`Image processing failed: ${(0, security_1.safeErrorMessage)(error)}`);
    }
}
/**
 * Process SVG input - sanitize, keep SVG, generate all PNG resolutions
 */
async function processSvgInput(buffer) {
    const rawSvgContent = buffer.toString("utf-8");
    // Sanitize SVG for security
    const sanitizeResult = (0, security_1.sanitizeSvg)(rawSvgContent);
    if (sanitizeResult.warnings.length > 0) {
        console.warn('SVG sanitization warnings:', sanitizeResult.warnings);
    }
    const svgContent = sanitizeResult.sanitized;
    const sanitizedBuffer = Buffer.from(svgContent);
    // Generate all resolutions in parallel
    const resizeOptions = { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } };
    const [png16, png32, png48, png64, png128, png192, png256, png512, appleTouchIcon] = await Promise.all([
        (0, sharp_1.default)(sanitizedBuffer).resize(16, 16, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(sanitizedBuffer).resize(32, 32, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(sanitizedBuffer).resize(48, 48, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(sanitizedBuffer).resize(64, 64, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(sanitizedBuffer).resize(128, 128, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(sanitizedBuffer).resize(192, 192, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(sanitizedBuffer).resize(256, 256, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(sanitizedBuffer).resize(512, 512, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(sanitizedBuffer).resize(180, 180, resizeOptions).png().toBuffer(),
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
async function processRasterInput(buffer) {
    const resizeOptions = { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } };
    // Generate all resolutions in parallel
    const [png16, png32, png48, png64, png128, png192, png256, png512, appleTouchIcon] = await Promise.all([
        (0, sharp_1.default)(buffer).resize(16, 16, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(buffer).resize(32, 32, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(buffer).resize(48, 48, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(buffer).resize(64, 64, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(buffer).resize(128, 128, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(buffer).resize(192, 192, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(buffer).resize(256, 256, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(buffer).resize(512, 512, resizeOptions).png().toBuffer(),
        (0, sharp_1.default)(buffer).resize(180, 180, resizeOptions).png().toBuffer(),
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
function createSvgWrapper(pngBuffer) {
    const base64 = pngBuffer.toString("base64");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <image width="192" height="192" href="data:image/png;base64,${base64}"/>
</svg>`;
}
/**
 * Generate favicon from text/initials configuration
 * Creates all standard resolutions for cross-device compatibility
 */
async function generateFaviconFromText(config) {
    const svg = generateTextSvg(config);
    const svgBuffer = Buffer.from(svg);
    // Generate all resolutions in parallel
    const [png16, png32, png48, png64, png128, png192, png256, png512, appleTouchIcon] = await Promise.all([
        (0, sharp_1.default)(svgBuffer).resize(16, 16).png().toBuffer(),
        (0, sharp_1.default)(svgBuffer).resize(32, 32).png().toBuffer(),
        (0, sharp_1.default)(svgBuffer).resize(48, 48).png().toBuffer(),
        (0, sharp_1.default)(svgBuffer).resize(64, 64).png().toBuffer(),
        (0, sharp_1.default)(svgBuffer).resize(128, 128).png().toBuffer(),
        (0, sharp_1.default)(svgBuffer).resize(192, 192).png().toBuffer(),
        (0, sharp_1.default)(svgBuffer).resize(256, 256).png().toBuffer(),
        (0, sharp_1.default)(svgBuffer).resize(512, 512).png().toBuffer(),
        (0, sharp_1.default)(svgBuffer).resize(180, 180).png().toBuffer(),
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
function generateTextSvg(config) {
    const { text, backgroundColor, textColor, fontFamily, shape } = config;
    let rx = "0";
    if (shape === "circle") {
        rx = "50";
    }
    else if (shape === "rounded") {
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
function escapeXml(text) {
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
async function svgToPngNode(svg, size) {
    const buffer = Buffer.from(svg);
    const png = await (0, sharp_1.default)(buffer)
        .resize(size, size)
        .png()
        .toBuffer();
    return png.toString("base64");
}
/**
 * Create all favicon assets from an SVG string
 */
async function createFaviconAssets(svgContent) {
    const svgBuffer = Buffer.from(svgContent);
    const [png32, png192] = await Promise.all([
        (0, sharp_1.default)(svgBuffer).resize(32, 32).png().toBuffer(),
        (0, sharp_1.default)(svgBuffer).resize(192, 192).png().toBuffer(),
    ]);
    return {
        svg: svgContent,
        pngBase64: png192.toString("base64"),
        icoBase64: png32.toString("base64"),
    };
}
