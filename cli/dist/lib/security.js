"use strict";
/**
 * Security utilities for Favicon Manager
 *
 * Handles SVG sanitization, URL validation, and input validation
 * to prevent XSS, SSRF, and other common vulnerabilities.
 *
 * @packageDocumentation
 * @module security
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.MAX_SVG_SIZE = exports.MAX_IMAGE_SIZE = void 0;
exports.sanitizeSvg = sanitizeSvg;
exports.validateUrl = validateUrl;
exports.validateRepoFormat = validateRepoFormat;
exports.validateTokenFormat = validateTokenFormat;
exports.validateFaviconText = validateFaviconText;
exports.validateHexColor = validateHexColor;
exports.safeErrorMessage = safeErrorMessage;
/**
 * Dangerous SVG elements that could execute scripts or load external resources
 */
const DANGEROUS_SVG_ELEMENTS = [
    'script',
    'foreignObject',
    'iframe',
    'embed',
    'object',
    'applet',
    'meta',
    'link',
    'style', // Could contain expressions in older browsers
    'animate', // Can trigger JS in some contexts
    'set',
    'animateTransform',
    'animateMotion',
    'animateColor',
    'handler', // SVG 1.2 script handler
    'listener', // SVG 1.2 event listener
];
/**
 * Dangerous SVG attributes that could execute scripts
 */
const DANGEROUS_SVG_ATTRIBUTES = [
    // Event handlers
    'onabort', 'onactivate', 'onafterprint', 'onafterupdate', 'onbeforeactivate',
    'onbeforecopy', 'onbeforecut', 'onbeforedeactivate', 'onbeforeeditfocus',
    'onbeforepaste', 'onbeforeprint', 'onbeforeunload', 'onbeforeupdate', 'onbegin',
    'onblur', 'onbounce', 'oncellchange', 'onchange', 'onclick', 'oncontextmenu',
    'oncontrolselect', 'oncopy', 'oncut', 'ondataavailable', 'ondatasetchanged',
    'ondatasetcomplete', 'ondblclick', 'ondeactivate', 'ondrag', 'ondragend',
    'ondragenter', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop', 'onend',
    'onerror', 'onerrorupdate', 'onfilterchange', 'onfinish', 'onfocus', 'onfocusin',
    'onfocusout', 'onhashchange', 'onhelp', 'oninput', 'onkeydown', 'onkeypress',
    'onkeyup', 'onlayoutcomplete', 'onload', 'onloadstart', 'onlosecapture',
    'onmessage', 'onmousedown', 'onmouseenter', 'onmouseleave', 'onmousemove',
    'onmouseout', 'onmouseover', 'onmouseup', 'onmousewheel', 'onmove', 'onmoveend',
    'onmovestart', 'onoffline', 'ononline', 'onpageshow', 'onpagehide', 'onpaste',
    'onpause', 'onplay', 'onplaying', 'onpopstate', 'onprogress', 'onpropertychange',
    'onratechange', 'onreadystatechange', 'onredo', 'onrepeat', 'onreset', 'onresize',
    'onresizeend', 'onresizestart', 'onrowenter', 'onrowexit', 'onrowsdelete',
    'onrowsinserted', 'onscroll', 'onsearch', 'onseek', 'onseeked', 'onseeking',
    'onselect', 'onselectionchange', 'onselectstart', 'onstart', 'onstop', 'onstorage',
    'onsubmit', 'ontimeupdate', 'ontoggle', 'ontouchcancel', 'ontouchend',
    'ontouchmove', 'ontouchstart', 'onunload', 'onundo', 'onvolumechange', 'onwaiting',
    'onwheel', 'onzoom',
    // Other dangerous attributes
    'xlink:href', // When pointing to javascript:
    'href', // When pointing to javascript:
    'formaction',
    'action',
    'data', // object element
    'srcdoc',
];
/**
 * Dangerous URL protocols that could execute scripts
 */
const DANGEROUS_PROTOCOLS = [
    'javascript:',
    'data:', // Except for images
    'vbscript:',
    'file:',
];
/**
 * Allowed URL protocols for external resources
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:'];
/**
 * Maximum allowed file size for images (10MB)
 */
exports.MAX_IMAGE_SIZE = 10 * 1024 * 1024;
/**
 * Maximum SVG file size (1MB - SVGs should be small)
 */
exports.MAX_SVG_SIZE = 1 * 1024 * 1024;
/**
 * Sanitize SVG content to remove potentially dangerous elements and attributes
 *
 * @param svg - Raw SVG string to sanitize
 * @returns Sanitization result with cleaned SVG and warnings
 *
 * @example
 * ```typescript
 * const result = sanitizeSvg(userInput);
 * if (result.safe) {
 *   useSvg(result.sanitized);
 * } else {
 *   console.warn('SVG was modified:', result.warnings);
 * }
 * ```
 */
function sanitizeSvg(svg) {
    const warnings = [];
    const removed = [];
    let sanitized = svg;
    // Check size
    if (svg.length > exports.MAX_SVG_SIZE) {
        return {
            safe: false,
            sanitized: '',
            warnings: [`SVG exceeds maximum size of ${exports.MAX_SVG_SIZE / 1024}KB`],
            removed: [],
        };
    }
    // Remove dangerous elements
    for (const element of DANGEROUS_SVG_ELEMENTS) {
        const regex = new RegExp(`<${element}[^>]*>.*?</${element}>|<${element}[^>]*/>|<${element}[^>]*>`, 'gis');
        const matches = sanitized.match(regex);
        if (matches) {
            removed.push(...matches.map(m => `Element: ${element}`));
            warnings.push(`Removed dangerous element: <${element}>`);
            sanitized = sanitized.replace(regex, '');
        }
    }
    // Remove dangerous attributes
    for (const attr of DANGEROUS_SVG_ATTRIBUTES) {
        // Match attribute with various quote styles and values
        const regex = new RegExp(`\\s${attr}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`, 'gi');
        const matches = sanitized.match(regex);
        if (matches) {
            removed.push(...matches.map(m => `Attribute: ${attr}`));
            warnings.push(`Removed dangerous attribute: ${attr}`);
            sanitized = sanitized.replace(regex, '');
        }
    }
    // Check for javascript: URLs in href/xlink:href
    const jsUrlRegex = /(?:href|xlink:href)\s*=\s*["']?\s*javascript:/gi;
    if (jsUrlRegex.test(sanitized)) {
        warnings.push('Removed javascript: URL');
        removed.push('javascript: URL');
        sanitized = sanitized.replace(/(?:href|xlink:href)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, '');
    }
    // Check for data: URLs (except images)
    const dataUrlRegex = /(?:href|xlink:href)\s*=\s*["']?\s*data:(?!image\/)/gi;
    if (dataUrlRegex.test(sanitized)) {
        warnings.push('Removed non-image data: URL');
        removed.push('data: URL (non-image)');
        sanitized = sanitized.replace(/(?:href|xlink:href)\s*=\s*["']?\s*data:(?!image\/)[^"'\s>]*/gi, '');
    }
    // Validate it's still valid XML
    if (!isValidXml(sanitized)) {
        return {
            safe: false,
            sanitized: '',
            warnings: ['SVG became invalid after sanitization'],
            removed,
        };
    }
    return {
        safe: warnings.length === 0,
        sanitized,
        warnings,
        removed,
    };
}
/**
 * Basic XML validation check
 */
function isValidXml(xml) {
    // Check for basic SVG structure
    const hasOpenTag = /<svg[^>]*>/i.test(xml);
    const hasCloseTag = /<\/svg>/i.test(xml);
    return hasOpenTag && hasCloseTag;
}
/**
 * Validate and sanitize a URL for external resource fetching
 *
 * @param url - URL to validate
 * @returns Validated URL or null if invalid
 *
 * @example
 * ```typescript
 * const safeUrl = validateUrl(userInput);
 * if (safeUrl) {
 *   fetch(safeUrl);
 * }
 * ```
 */
function validateUrl(url) {
    try {
        const parsed = new URL(url);
        // Check protocol
        if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
            return null;
        }
        // Prevent localhost/internal network access (SSRF protection)
        const hostname = parsed.hostname.toLowerCase();
        if (hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.16.') ||
            hostname.startsWith('172.17.') ||
            hostname.startsWith('172.18.') ||
            hostname.startsWith('172.19.') ||
            hostname.startsWith('172.2') ||
            hostname.startsWith('172.30.') ||
            hostname.startsWith('172.31.') ||
            hostname === '[::1]' ||
            hostname.endsWith('.local') ||
            hostname.endsWith('.internal')) {
            return null;
        }
        return parsed.href;
    }
    catch {
        return null;
    }
}
/**
 * Validate GitHub repository format
 *
 * @param repo - Repository string to validate
 * @returns Parsed owner/repo or null if invalid
 */
function validateRepoFormat(repo) {
    // GitHub repo names: alphanumeric, hyphens, underscores, periods
    // Owner names: alphanumeric, hyphens
    const repoRegex = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)\/([a-zA-Z0-9._-]+)$/;
    const match = repo.match(repoRegex);
    if (!match) {
        return null;
    }
    return {
        owner: match[1],
        repo: match[2],
    };
}
/**
 * Validate GitHub Personal Access Token format
 * Note: This doesn't verify the token is valid, just that it looks correct
 *
 * @param token - Token to validate
 * @returns Whether the token format is valid
 */
function validateTokenFormat(token) {
    // Classic tokens: ghp_xxxx (40 chars after prefix)
    // Fine-grained tokens: github_pat_xxxx
    // OAuth tokens: gho_xxxx
    const tokenRegex = /^(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{22,}|gho_[a-zA-Z0-9]{36})$/;
    return tokenRegex.test(token);
}
/**
 * Validate favicon text input
 * Prevents XSS via text that might be rendered
 *
 * @param text - Text to validate
 * @returns Sanitized text or null if invalid
 */
function validateFaviconText(text) {
    if (!text || text.length === 0 || text.length > 2) {
        return null;
    }
    // Only allow alphanumeric characters for favicon text
    const sanitized = text.replace(/[^a-zA-Z0-9]/g, '');
    if (sanitized.length === 0) {
        return null;
    }
    return sanitized.toUpperCase();
}
/**
 * Validate hex color format
 *
 * @param color - Color string to validate
 * @returns Whether the color is a valid hex color
 */
function validateHexColor(color) {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
}
/**
 * Rate limiting helper - tracks requests per time window
 */
class RateLimiter {
    requests = new Map();
    windowMs;
    maxRequests;
    constructor(windowMs = 60000, maxRequests = 30) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
    }
    /**
     * Check if a key is rate limited
     * @param key - Identifier (e.g., IP address, user ID)
     * @returns Whether the request should be allowed
     */
    isAllowed(key) {
        const now = Date.now();
        const timestamps = this.requests.get(key) || [];
        // Remove old timestamps
        const validTimestamps = timestamps.filter(t => now - t < this.windowMs);
        if (validTimestamps.length >= this.maxRequests) {
            return false;
        }
        validTimestamps.push(now);
        this.requests.set(key, validTimestamps);
        return true;
    }
    /**
     * Clear rate limit data for a key
     */
    clear(key) {
        this.requests.delete(key);
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Safely log errors without exposing sensitive information
 */
function safeErrorMessage(error) {
    if (error instanceof Error) {
        // Don't expose stack traces or internal paths
        const message = error.message;
        // Remove file paths
        const sanitized = message.replace(/\/[^\s]+/g, '[path]');
        // Remove potential tokens/secrets
        return sanitized.replace(/(ghp_|github_pat_|gho_)[a-zA-Z0-9_]+/g, '[token]');
    }
    return 'An unexpected error occurred';
}
