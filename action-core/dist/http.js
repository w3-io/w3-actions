import { W3ActionError } from "./error.js";
/**
 * Make an HTTP request with timeout, retry, and structured errors.
 *
 * - Retries on 429 and 5xx with exponential backoff
 * - Parses JSON response automatically
 * - Throws W3ActionError with status code on failure
 */
export async function request(url, options = {}) {
    const { method = "GET", headers = {}, body, timeout = 30000, retries = 2, retryDelay = 1000, } = options;
    const init = {
        method,
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        signal: AbortSignal.timeout(timeout),
    };
    if (body !== undefined) {
        init.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, init);
            const raw = await res.text();
            let parsed;
            try {
                parsed = JSON.parse(raw);
            }
            catch {
                parsed = raw;
            }
            const responseHeaders = {};
            res.headers.forEach((v, k) => {
                responseHeaders[k] = v;
            });
            if (!res.ok) {
                // Retry on 429 (rate limit) and 5xx (server error)
                if ((res.status === 429 || res.status >= 500) &&
                    attempt < retries) {
                    await sleep(retryDelay * 2 ** attempt);
                    continue;
                }
                throw new W3ActionError("HTTP_ERROR", `${method} ${url}: ${res.status}`, {
                    statusCode: res.status,
                    details: parsed,
                });
            }
            return { status: res.status, headers: responseHeaders, body: parsed, raw };
        }
        catch (error) {
            if (error instanceof W3ActionError)
                throw error;
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < retries) {
                await sleep(retryDelay * 2 ** attempt);
                continue;
            }
        }
    }
    throw new W3ActionError("REQUEST_FAILED", `${method} ${url}: ${lastError?.message ?? "unknown error"}`);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Convenience: add API key auth header.
 */
export function apiKeyAuth(key, headerName = "Authorization", prefix = "Bearer") {
    return { [headerName]: `${prefix} ${key}` };
}
/**
 * Convenience: add basic auth header.
 */
export function basicAuth(username, password) {
    const encoded = Buffer.from(`${username}:${password}`).toString("base64");
    return { Authorization: `Basic ${encoded}` };
}
