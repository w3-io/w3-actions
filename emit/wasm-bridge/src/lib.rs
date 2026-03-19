//! WASM bridge for w3io-emit-core.
//!
//! Handles event serialization and HMAC signature computation in
//! WASM. The actual webhook delivery (HTTP POST) is done by JS.
//! This keeps the crypto deterministic across native and WASM.

use wasm_bindgen::prelude::*;

/// Prepare an event for webhook delivery.
///
/// Serializes the event to JSON and computes the HMAC-SHA256
/// signature if a secret is provided. Returns a JSON object:
/// `{body: string, signature: string|null}`
///
/// The JS side handles the actual HTTP POST using the returned
/// body and signature.
#[wasm_bindgen]
pub fn prepare_event(
    name: &str,
    payload_json: &str,
    source: &str,
    step: &str,
    timestamp: &str,
    secret: &str,
) -> Result<String, JsError> {
    let payload: serde_json::Value = serde_json::from_str(payload_json)
        .map_err(|e| JsError::new(&format!("invalid payload JSON: {e}")))?;

    let event = w3io_emit_core::Event {
        name: name.to_string(),
        payload,
        timestamp: timestamp.to_string(),
        source: if source.is_empty() { None } else { Some(source.to_string()) },
        step: if step.is_empty() { None } else { Some(step.to_string()) },
    };

    let body = serde_json::to_string(&event)
        .map_err(|e| JsError::new(&format!("serialization failed: {e}")))?;

    let signature = if secret.is_empty() {
        None
    } else {
        let mac = w3io_encode_core::hmac_sha256(secret.as_bytes(), body.as_bytes());
        let hex = w3io_encode_core::hex_encode(&mac);
        Some(format!("sha256={hex}"))
    };

    let result = serde_json::json!({
        "body": body,
        "signature": signature,
    });

    Ok(result.to_string())
}
