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
let _inputs = {};
let _outputs = new Map();
let _failed = null;
/**
 * Set up mock inputs for the next action invocation.
 * Call this before importing/running the action.
 */
export function mockAction(inputs) {
    _inputs = inputs;
    _outputs = new Map();
    _failed = null;
    // Mock process.env for @actions/core.getInput()
    for (const [key, value] of Object.entries(inputs)) {
        const envKey = `INPUT_${key.replace(/-/g, "_").toUpperCase()}`;
        process.env[envKey] = value;
    }
}
/**
 * Get an output that was set during action execution.
 */
export function getOutput(name) {
    return _outputs.get(name);
}
/**
 * Assert an output was set and optionally validate its value.
 */
export function expectOutput(name, validator) {
    const value = _outputs.get(name);
    if (value === undefined) {
        throw new Error(`Expected output "${name}" to be set. Got: ${JSON.stringify(Object.fromEntries(_outputs))}`);
    }
    if (validator && !validator(value)) {
        throw new Error(`Output "${name}" failed validation. Value: ${value}`);
    }
}
/**
 * Assert the action failed with a specific message pattern.
 */
export function expectFailed(pattern) {
    if (_failed === null) {
        throw new Error("Expected action to fail, but it succeeded");
    }
    if (pattern) {
        const matches = typeof pattern === "string"
            ? _failed.includes(pattern)
            : pattern.test(_failed);
        if (!matches) {
            throw new Error(`Expected failure matching "${pattern}", got: "${_failed}"`);
        }
    }
}
/**
 * Assert the action succeeded (did not call setFailed).
 */
export function expectSuccess() {
    if (_failed !== null) {
        throw new Error(`Expected action to succeed, but it failed: "${_failed}"`);
    }
}
/**
 * Clean up mock environment after tests.
 */
export function cleanupMock() {
    for (const key of Object.keys(process.env)) {
        if (key.startsWith("INPUT_")) {
            delete process.env[key];
        }
    }
    _inputs = {};
    _outputs = new Map();
    _failed = null;
}
/**
 * Create a mock @actions/core module that captures outputs and failures.
 *
 * Use this to intercept setOutput/setFailed calls:
 *   const core = createMockCore();
 *   // pass core to your command handler
 */
export function createMockCore() {
    return {
        getInput: (name, opts) => {
            const value = _inputs[name] ?? "";
            if (opts?.required && !value) {
                throw new Error(`Input required and not supplied: ${name}`);
            }
            return value;
        },
        setOutput: (name, value) => {
            _outputs.set(name, typeof value === "string" ? value : JSON.stringify(value));
        },
        setFailed: (message) => {
            _failed = message;
        },
        info: (_msg) => { },
        warning: (_msg) => { },
        error: (_msg) => { },
        debug: (_msg) => { },
        summary: {
            addHeading: () => ({ addRaw: () => ({ write: async () => { } }) }),
        },
    };
}
