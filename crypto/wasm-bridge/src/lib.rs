//! WASM bridge for w3io-crypto-core.
//!
//! Thin wrapper that exposes crypto-core functions via wasm-bindgen
//! for consumption by the JavaScript action wrapper.

use wasm_bindgen::prelude::*;

// -------------------------------------------------------------------------
// Hashing
// -------------------------------------------------------------------------

#[wasm_bindgen]
pub fn keccak_256(data: &[u8]) -> Vec<u8> {
    w3io_crypto_core::hashing::keccak_256(data).to_vec()
}

// -------------------------------------------------------------------------
// AES-256-GCM
// -------------------------------------------------------------------------

#[wasm_bindgen]
pub fn aes_encrypt(key: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, JsError> {
    w3io_crypto_core::symmetric::aes_256_gcm_encrypt(key, plaintext)
        .map_err(|e| JsError::new(&e.to_string()))
}

#[wasm_bindgen]
pub fn aes_decrypt(key: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>, JsError> {
    w3io_crypto_core::symmetric::aes_256_gcm_decrypt(key, ciphertext)
        .map_err(|e| JsError::new(&e.to_string()))
}

// -------------------------------------------------------------------------
// Ed25519
// -------------------------------------------------------------------------

#[wasm_bindgen]
pub fn ed25519_sign(private_key: &[u8], message: &[u8]) -> Result<Vec<u8>, JsError> {
    w3io_crypto_core::signing::ed25519_sign(private_key, message)
        .map(|sig| sig.to_vec())
        .map_err(|e| JsError::new(&e.to_string()))
}

#[wasm_bindgen]
pub fn ed25519_verify(
    public_key: &[u8],
    message: &[u8],
    signature: &[u8],
) -> Result<bool, JsError> {
    w3io_crypto_core::signing::ed25519_verify(public_key, message, signature)
        .map_err(|e| JsError::new(&e.to_string()))
}

#[wasm_bindgen]
pub fn ed25519_public_key(private_key: &[u8]) -> Result<Vec<u8>, JsError> {
    w3io_crypto_core::signing::ed25519_public_key(private_key)
        .map(|pk| pk.to_vec())
        .map_err(|e| JsError::new(&e.to_string()))
}

// -------------------------------------------------------------------------
// HKDF
// -------------------------------------------------------------------------

#[wasm_bindgen]
pub fn hkdf_sha256(
    ikm: &[u8],
    salt: &[u8],
    info: &[u8],
    length: usize,
) -> Result<Vec<u8>, JsError> {
    w3io_crypto_core::kdf::hkdf_sha256(ikm, salt, info, length)
        .map_err(|e| JsError::new(&e.to_string()))
}

// -------------------------------------------------------------------------
// JWT
// -------------------------------------------------------------------------

#[wasm_bindgen]
pub fn jwt_create(algorithm: &str, claims: &str, key: &[u8]) -> Result<String, JsError> {
    let alg = parse_algorithm(algorithm)?;
    w3io_crypto_core::jwt::jwt_create(alg, claims, key)
        .map_err(|e| JsError::new(&e.to_string()))
}

#[wasm_bindgen]
pub fn jwt_verify(
    token: &str,
    algorithm: &str,
    key: &[u8],
    current_time: Option<u64>,
) -> Result<String, JsError> {
    let alg = parse_algorithm(algorithm)?;
    w3io_crypto_core::jwt::jwt_verify(token, alg, key, current_time)
        .map_err(|e| JsError::new(&e.to_string()))
}

fn parse_algorithm(s: &str) -> Result<w3io_crypto_core::jwt::JwtAlgorithm, JsError> {
    match s {
        "HS256" => Ok(w3io_crypto_core::jwt::JwtAlgorithm::HS256),
        "EdDSA" => Ok(w3io_crypto_core::jwt::JwtAlgorithm::EdDSA),
        other => Err(JsError::new(&format!("unsupported algorithm: {other}"))),
    }
}

// -------------------------------------------------------------------------
// TOTP
// -------------------------------------------------------------------------

#[wasm_bindgen]
pub fn totp_generate(secret: &[u8], time: u64) -> Result<String, JsError> {
    w3io_crypto_core::totp::totp_generate(secret, time)
        .map_err(|e| JsError::new(&e.to_string()))
}

// -------------------------------------------------------------------------
// Hex helpers (for JS convenience)
// -------------------------------------------------------------------------

#[wasm_bindgen]
pub fn hex_encode(data: &[u8]) -> String {
    hex::encode(data)
}

#[wasm_bindgen]
pub fn hex_decode(s: &str) -> Result<Vec<u8>, JsError> {
    let clean = s.strip_prefix("0x").unwrap_or(s);
    hex::decode(clean).map_err(|e| JsError::new(&e.to_string()))
}
