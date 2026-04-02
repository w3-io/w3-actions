import { W3ActionError } from "./error.js";

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
export async function request(
  url: string,
  options: RequestOptions = {},
): Promise<RequestResult> {
  const {
    method = "GET",
    headers = {},
    body,
    timeout = 30000,
    retries = 2,
    retryDelay = 1000,
  } = options;

  const init: RequestInit = {
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

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      const raw = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        responseHeaders[k] = v;
      });

      if (!res.ok) {
        // Retry on 429 (rate limit) and 5xx (server error)
        if (
          (res.status === 429 || res.status >= 500) &&
          attempt < retries
        ) {
          await sleep(retryDelay * 2 ** attempt);
          continue;
        }

        throw new W3ActionError("HTTP_ERROR", `${method} ${url}: ${res.status}`, {
          statusCode: res.status,
          details: parsed,
        });
      }

      return { status: res.status, headers: responseHeaders, body: parsed, raw };
    } catch (error) {
      if (error instanceof W3ActionError) throw error;
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await sleep(retryDelay * 2 ** attempt);
        continue;
      }
    }
  }

  throw new W3ActionError(
    "REQUEST_FAILED",
    `${method} ${url}: ${lastError?.message ?? "unknown error"}`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convenience: add API key auth header.
 */
export function apiKeyAuth(
  key: string,
  headerName = "Authorization",
  prefix = "Bearer",
): Record<string, string> {
  return { [headerName]: `${prefix} ${key}` };
}

/**
 * Convenience: add basic auth header.
 */
export function basicAuth(
  username: string,
  password: string,
): Record<string, string> {
  const encoded = Buffer.from(`${username}:${password}`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}
