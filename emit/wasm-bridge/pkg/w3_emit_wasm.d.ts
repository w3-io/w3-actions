/* tslint:disable */
/* eslint-disable */

/**
 * Prepare an event for webhook delivery.
 *
 * Serializes the event to JSON and computes the HMAC-SHA256
 * signature if a secret is provided. Returns a JSON object:
 * `{body: string, signature: string|null}`
 *
 * The JS side handles the actual HTTP POST using the returned
 * body and signature.
 */
export function prepare_event(name: string, payload_json: string, source: string, step: string, timestamp: string, secret: string): string;
