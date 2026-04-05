/**
 * Security utilities for Favicon Manager
 *
 * Handles SVG sanitization, URL validation, and input validation
 * to prevent XSS, SSRF, and other common vulnerabilities.
 *
 * @packageDocumentation
 * @module security
 */
/**
 * Maximum allowed file size for images (10MB)
 */
export declare const MAX_IMAGE_SIZE: number;
/**
 * Maximum SVG file size (1MB - SVGs should be small)
 */
export declare const MAX_SVG_SIZE: number;
/**
 * Result of SVG sanitization
 */
export interface SanitizeResult {
    safe: boolean;
    sanitized: string;
    warnings: string[];
    removed: string[];
}
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
export declare function sanitizeSvg(svg: string): SanitizeResult;
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
export declare function validateUrl(url: string): string | null;
/**
 * Validate GitHub repository format
 *
 * @param repo - Repository string to validate
 * @returns Parsed owner/repo or null if invalid
 */
export declare function validateRepoFormat(repo: string): {
    owner: string;
    repo: string;
} | null;
/**
 * Validate GitHub Personal Access Token format
 * Note: This doesn't verify the token is valid, just that it looks correct
 *
 * @param token - Token to validate
 * @returns Whether the token format is valid
 */
export declare function validateTokenFormat(token: string): boolean;
/**
 * Validate favicon text input
 * Prevents XSS via text that might be rendered
 *
 * @param text - Text to validate
 * @returns Sanitized text or null if invalid
 */
export declare function validateFaviconText(text: string): string | null;
/**
 * Validate hex color format
 *
 * @param color - Color string to validate
 * @returns Whether the color is a valid hex color
 */
export declare function validateHexColor(color: string): boolean;
/**
 * Rate limiting helper - tracks requests per time window
 */
export declare class RateLimiter {
    private requests;
    private windowMs;
    private maxRequests;
    constructor(windowMs?: number, maxRequests?: number);
    /**
     * Check if a key is rate limited
     * @param key - Identifier (e.g., IP address, user ID)
     * @returns Whether the request should be allowed
     */
    isAllowed(key: string): boolean;
    /**
     * Clear rate limit data for a key
     */
    clear(key: string): void;
}
/**
 * Safely log errors without exposing sensitive information
 */
export declare function safeErrorMessage(error: unknown): string;
