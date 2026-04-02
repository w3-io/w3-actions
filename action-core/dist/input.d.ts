/**
 * Parse a JSON input. Returns the parsed value or undefined if empty.
 * Throws with a clear message if the input contains invalid JSON.
 */
export declare function parseJsonInput<T = unknown>(name: string): T | undefined;
/**
 * Get a required input. Throws if missing or empty.
 */
export declare function requireInput(name: string): string;
/**
 * Get an optional input with a default value.
 */
export declare function getOptionalInput(name: string, defaultValue?: string): string;
