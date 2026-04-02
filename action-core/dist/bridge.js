/**
 * W3 Syscall Bridge client.
 *
 * The bridge is an HTTP server running on a Unix socket (production)
 * or TCP port (macOS dev fallback), started per-step by the Docker
 * backend. It provides access to chain operations, cryptographic
 * primitives, and protocol-managed secrets without bundling SDKs
 * in the action container.
 *
 * Connection is automatic:
 *   - $W3_BRIDGE_SOCKET → Unix socket (production)
 *   - $W3_BRIDGE_URL    → TCP URL (macOS Docker Desktop fallback)
 *
 * Usage:
 *   import { bridge } from "@w3-io/action-core";
 *
 *   const balance = await bridge.chain("ethereum", "get-balance", {
 *     address: "0x...",
 *   });
 *
 *   const hash = await bridge.crypto("keccak-256", { data: "0xdeadbeef" });
 */
import { W3ActionError } from "./error.js";
// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------
/**
 * Resolve the bridge endpoint from environment variables.
 *
 * Returns a fetch-compatible URL and optional Unix socket path.
 */
function resolveEndpoint() {
    const bridgeUrl = process.env.W3_BRIDGE_URL;
    if (bridgeUrl) {
        return { url: bridgeUrl };
    }
    const socketPath = process.env.W3_BRIDGE_SOCKET ?? "/var/run/w3/bridge.sock";
    // Node's fetch doesn't support Unix sockets natively.
    // We use http.request for Unix socket transport.
    return { url: "http://localhost", socketPath };
}
/**
 * Make an HTTP request to the bridge. Handles both TCP and Unix socket
 * transports transparently.
 */
async function bridgeRequest(path, body) {
    const { url, socketPath } = resolveEndpoint();
    if (socketPath) {
        // Unix socket transport via Node's http module
        const http = await import("node:http");
        return new Promise((resolve, reject) => {
            const payload = body ? JSON.stringify(body) : undefined;
            const req = http.request({
                socketPath,
                path,
                method: body ? "POST" : "GET",
                headers: {
                    "Content-Type": "application/json",
                    ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
                },
            }, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (!res.statusCode || res.statusCode >= 400) {
                        try {
                            const err = JSON.parse(data);
                            reject(new W3ActionError(err.code ?? "BRIDGE_ERROR", err.error ?? `Bridge returned ${res.statusCode}`, { statusCode: res.statusCode, details: err }));
                        }
                        catch {
                            reject(new W3ActionError("BRIDGE_ERROR", data || `HTTP ${res.statusCode}`, {
                                statusCode: res.statusCode,
                            }));
                        }
                        return;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    }
                    catch {
                        resolve(data);
                    }
                });
            });
            req.on("error", (err) => reject(new W3ActionError("BRIDGE_UNAVAILABLE", err.message)));
            if (payload)
                req.write(payload);
            req.end();
        });
    }
    // TCP transport via fetch
    const fullUrl = `${url}${path}`;
    const init = {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
    };
    const res = await fetch(fullUrl, init);
    const text = await res.text();
    if (!res.ok) {
        let parsed;
        try {
            parsed = JSON.parse(text);
        }
        catch {
            // not JSON
        }
        throw new W3ActionError(parsed?.code ?? "BRIDGE_ERROR", parsed?.error ?? text ?? `Bridge returned ${res.status}`, { statusCode: res.status, details: parsed });
    }
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
/**
 * Check if the bridge is available.
 */
async function health() {
    try {
        const res = (await bridgeRequest("/health"));
        return res.ok === true;
    }
    catch {
        return false;
    }
}
/**
 * Call a chain operation via the bridge.
 *
 * @param chain - "ethereum", "bitcoin", or "solana"
 * @param action - Operation name (e.g. "get-balance", "transfer", "call-contract")
 * @param params - Action-specific parameters
 * @param network - Network identifier (e.g. "ethereum-sepolia", "avalanche-fuji")
 */
async function chain(chainName, action, params, network) {
    return (await bridgeRequest(`/${chainName}/${action}`, {
        network: network ?? chainName,
        params,
    }));
}
/**
 * Call a crypto operation via the bridge.
 *
 * @param action - Operation name (e.g. "keccak-256", "aes-encrypt", "jwt-create")
 * @param params - Operation-specific parameters
 */
async function crypto(action, params) {
    return (await bridgeRequest(`/crypto/${action}`, {
        params,
    }));
}
/**
 * The bridge client. Import and use:
 *
 *   import { bridge } from "@w3-io/action-core";
 *
 *   // Chain operations
 *   const bal = await bridge.chain("ethereum", "get-balance", { address });
 *
 *   // Crypto
 *   const hash = await bridge.crypto("keccak-256", { data: "0x..." });
 *
 *   // Health check
 *   const ok = await bridge.health();
 */
export const bridge = {
    health,
    chain,
    crypto,
};
