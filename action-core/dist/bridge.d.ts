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
export interface BridgeResponse {
    ok: boolean;
    [key: string]: unknown;
}
/**
 * Check if the bridge is available.
 */
declare function health(): Promise<boolean>;
/**
 * Call a chain operation via the bridge.
 *
 * @param chain - "ethereum", "bitcoin", or "solana"
 * @param action - Operation name (e.g. "get-balance", "transfer", "call-contract")
 * @param params - Action-specific parameters
 * @param network - Network identifier (e.g. "ethereum-sepolia", "avalanche-fuji")
 */
declare function chain(chainName: string, action: string, params: Record<string, unknown>, network?: string): Promise<BridgeResponse>;
/**
 * Call a crypto operation via the bridge.
 *
 * @param action - Operation name (e.g. "keccak-256", "aes-encrypt", "jwt-create")
 * @param params - Operation-specific parameters
 */
declare function crypto(action: string, params: Record<string, unknown>): Promise<BridgeResponse>;
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
export declare const bridge: {
    health: typeof health;
    chain: typeof chain;
    crypto: typeof crypto;
};
export {};
