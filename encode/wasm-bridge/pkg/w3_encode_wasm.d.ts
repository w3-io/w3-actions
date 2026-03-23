/* tslint:disable */
/* eslint-disable */

export function base64_decode(encoded: string): Uint8Array;

export function base64_encode(data: Uint8Array): string;

export function base64url_decode(encoded: string): Uint8Array;

export function base64url_encode(data: Uint8Array): string;

export function hex_decode(encoded: string): Uint8Array;

export function hex_encode(data: Uint8Array): string;

export function hex_encode_prefixed(data: Uint8Array): string;

export function hmac_sha256(key: Uint8Array, message: Uint8Array): Uint8Array;

export function sha256(data: Uint8Array): Uint8Array;

export function url_decode(input: string): string;

export function url_encode(input: string): string;
