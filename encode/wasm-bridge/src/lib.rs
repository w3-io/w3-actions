//! WASM bridge for w3io-encode-core.
//!
//! Thin wrapper that exposes encode-core functions via wasm-bindgen
//! for consumption by the JavaScript action wrapper.

use wasm_bindgen::prelude::*;

// -------------------------------------------------------------------------
// Base64
// -------------------------------------------------------------------------

#[wasm_bindgen]
pub fn base64_encode(data: &[u8]) -> String {
    w3io_encode_core::base64_encode(data)
}

#[wasm_bindgen]
pub fn base64_decode(encoded: &str) -> Result<Vec<u8>, JsError> {
    w3io_encode_core::base64_decode(encoded).map_err(|e| JsError::new(&e.to_string()))
}

#[wasm_bindgen]
pub fn base64url_encode(data: &[u8]) -> String {
    w3io_encode_core::base64url_encode(data)
}

#[wasm_bindgen]
pub fn base64url_decode(encoded: &str) -> Result<Vec<u8>, JsError> {
    w3io_encode_core::base64url_decode(encoded).map_err(|e| JsError::new(&e.to_string()))
}

// -------------------------------------------------------------------------
// Hex
// -------------------------------------------------------------------------

#[wasm_bindgen]
pub fn hex_encode(data: &[u8]) -> String {
    w3io_encode_core::hex_encode(data)
}

#[wasm_bindgen]
pub fn hex_encode_prefixed(data: &[u8]) -> String {
    w3io_encode_core::hex_encode_prefixed(data)
}

#[wasm_bindgen]
pub fn hex_decode(encoded: &str) -> Result<Vec<u8>, JsError> {
    w3io_encode_core::hex_decode(encoded).map_err(|e| JsError::new(&e.to_string()))
}

// -------------------------------------------------------------------------
// URL encoding
// -------------------------------------------------------------------------

#[wasm_bindgen]
pub fn url_encode(input: &str) -> String {
    w3io_encode_core::url_encode(input)
}

#[wasm_bindgen]
pub fn url_decode(input: &str) -> Result<String, JsError> {
    w3io_encode_core::url_decode(input).map_err(|e| JsError::new(&e.to_string()))
}

// -------------------------------------------------------------------------
// SHA-256 / HMAC
// -------------------------------------------------------------------------

#[wasm_bindgen]
pub fn sha256(data: &[u8]) -> Vec<u8> {
    w3io_encode_core::sha256(data).to_vec()
}

#[wasm_bindgen]
pub fn hmac_sha256(key: &[u8], message: &[u8]) -> Vec<u8> {
    w3io_encode_core::hmac_sha256(key, message).to_vec()
}
