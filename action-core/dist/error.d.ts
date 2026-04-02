/**
 * Structured error with code, message, and optional details.
 */
export declare class W3ActionError extends Error {
    readonly code: string;
    readonly statusCode?: number;
    readonly details?: unknown;
    constructor(code: string, message: string, options?: {
        statusCode?: number;
        details?: unknown;
    });
}
/**
 * Top-level error handler for action entry points.
 *
 * Usage:
 *   main().catch(handleError);
 */
export declare function handleError(error: unknown): void;
