/* tslint:disable */
/* eslint-disable */

/**
 * Execute an HTTP request with retry logic.
 *
 * `fetch_fn`: JS function `(method, url, headers_json, body) => Promise<{status, headers, body}>`
 * `sleep_fn`: JS function `(ms) => Promise<void>`
 *
 * Returns JSON: `{"status": number, "headers": [[k,v]], "body": "string"}`
 */
export function execute(fetch_fn: Function, sleep_fn: Function, method: string, url: string, headers_json: string, body: string, max_retries: number, base_delay_ms: number, timeout_ms: number): Promise<string>;
