/**
 * Test utilities for W3 actions.
 *
 * Mocks @actions/core so you can test command handlers in isolation
 * without running the full GitHub Actions runtime.
 *
 * Usage:
 *   import { mockAction, expectOutput, expectFailed } from "@w3-io/action-core/test";
 *
 *   test("keccak-256 hashes correctly", async () => {
 *     mockAction({ command: "keccak-256", input: "48656c6c6f" });
 *     await import("../src/index.js");
 *     expectOutput("result", (val) => val.includes("hash"));
 *   });
 */
/**
 * Set up mock inputs for the next action invocation.
 * Call this before importing/running the action.
 */
export declare function mockAction(inputs: Record<string, string>): void;
/**
 * Get an output that was set during action execution.
 */
export declare function getOutput(name: string): string | undefined;
/**
 * Assert an output was set and optionally validate its value.
 */
export declare function expectOutput(name: string, validator?: (value: string) => boolean): void;
/**
 * Assert the action failed with a specific message pattern.
 */
export declare function expectFailed(pattern?: string | RegExp): void;
/**
 * Assert the action succeeded (did not call setFailed).
 */
export declare function expectSuccess(): void;
/**
 * Clean up mock environment after tests.
 */
export declare function cleanupMock(): void;
/**
 * Create a mock @actions/core module that captures outputs and failures.
 *
 * Use this to intercept setOutput/setFailed calls:
 *   const core = createMockCore();
 *   // pass core to your command handler
 */
export declare function createMockCore(): {
    getInput: (name: string, opts?: {
        required?: boolean;
    }) => string;
    setOutput: (name: string, value: string) => void;
    setFailed: (message: string) => void;
    info: (_msg: string) => void;
    warning: (_msg: string) => void;
    error: (_msg: string) => void;
    debug: (_msg: string) => void;
    summary: {
        addHeading: () => {
            addRaw: () => {
                write: () => Promise<void>;
            };
        };
    };
};
