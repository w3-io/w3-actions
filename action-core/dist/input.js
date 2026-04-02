import * as core from "@actions/core";
/**
 * Parse a JSON input. Returns the parsed value or undefined if empty.
 * Throws with a clear message if the input contains invalid JSON.
 */
export function parseJsonInput(name) {
    const raw = core.getInput(name);
    if (!raw.trim())
        return undefined;
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new Error(`Input '${name}' is not valid JSON: ${raw.slice(0, 100)}`);
    }
}
/**
 * Get a required input. Throws if missing or empty.
 */
export function requireInput(name) {
    const value = core.getInput(name);
    if (!value.trim()) {
        throw new Error(`Required input '${name}' is missing`);
    }
    return value;
}
/**
 * Get an optional input with a default value.
 */
export function getOptionalInput(name, defaultValue = "") {
    const value = core.getInput(name);
    return value.trim() || defaultValue;
}
