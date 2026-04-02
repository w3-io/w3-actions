export interface RequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
}
export interface RequestResult {
    status: number;
    headers: Record<string, string>;
    body: unknown;
    raw: string;
}
/**
 * Make an HTTP request with timeout, retry, and structured errors.
 *
 * - Retries on 429 and 5xx with exponential backoff
 * - Parses JSON response automatically
 * - Throws W3ActionError with status code on failure
 */
export declare function request(url: string, options?: RequestOptions): Promise<RequestResult>;
/**
 * Convenience: add API key auth header.
 */
export declare function apiKeyAuth(key: string, headerName?: string, prefix?: string): Record<string, string>;
/**
 * Convenience: add basic auth header.
 */
export declare function basicAuth(username: string, password: string): Record<string, string>;
