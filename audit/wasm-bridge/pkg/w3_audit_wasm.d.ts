/* tslint:disable */
/* eslint-disable */

/**
 * Create a serialized audit entry with an auto-incremented sequence number.
 *
 * Returns a JSON string representing the `AuditEntry`. The JS side
 * is responsible for persisting it via its store implementation.
 */
export function create_entry(category: string, message: string, data_json: string, workflow: string, job: string, step: string, timestamp: string): string;

/**
 * Reset the sequence counter (for testing).
 */
export function reset_sequence(): void;
