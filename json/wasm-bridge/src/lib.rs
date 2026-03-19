//! WASM bridge for w3io-json-core.
//!
//! All functions accept and return JSON strings. The JS wrapper
//! handles `JSON.parse`/`JSON.stringify` on its side.

use wasm_bindgen::prelude::*;

fn parse(json_str: &str) -> Result<serde_json::Value, JsError> {
    serde_json::from_str(json_str).map_err(|e| JsError::new(&format!("invalid JSON: {e}")))
}

fn to_string(value: &serde_json::Value) -> String {
    serde_json::to_string(value).unwrap_or_default()
}

#[wasm_bindgen]
pub fn extract(json_str: &str, path: &str) -> Result<String, JsError> {
    let value = parse(json_str)?;
    let result = w3io_json_core::extract(&value, path).map_err(|e| JsError::new(&e.to_string()))?;
    Ok(to_string(&result))
}

#[wasm_bindgen]
pub fn merge(base_str: &str, overlay_str: &str) -> Result<String, JsError> {
    let base = parse(base_str)?;
    let overlay = parse(overlay_str)?;
    Ok(to_string(&w3io_json_core::merge(&base, &overlay)))
}

#[wasm_bindgen]
pub fn filter(array_str: &str, field: &str, expected_str: &str) -> Result<String, JsError> {
    let array = parse(array_str)?;
    let expected = parse(expected_str)?;
    let result =
        w3io_json_core::filter(&array, field, &expected).map_err(|e| JsError::new(&e.to_string()))?;
    Ok(to_string(&result))
}

#[wasm_bindgen]
pub fn map_field(array_str: &str, field: &str) -> Result<String, JsError> {
    let array = parse(array_str)?;
    let result = w3io_json_core::map_field(&array, field).map_err(|e| JsError::new(&e.to_string()))?;
    Ok(to_string(&result))
}

#[wasm_bindgen]
pub fn count(json_str: &str) -> Result<usize, JsError> {
    let value = parse(json_str)?;
    w3io_json_core::count(&value).map_err(|e| JsError::new(&e.to_string()))
}

#[wasm_bindgen]
pub fn flatten(array_str: &str) -> Result<String, JsError> {
    let array = parse(array_str)?;
    let result = w3io_json_core::flatten(&array).map_err(|e| JsError::new(&e.to_string()))?;
    Ok(to_string(&result))
}

#[wasm_bindgen]
pub fn pick(object_str: &str, keys_str: &str) -> Result<String, JsError> {
    let object = parse(object_str)?;
    // Keys are passed as a JSON array of strings: ["a", "b"]
    let keys_value = parse(keys_str)?;
    let keys: Vec<&str> = keys_value
        .as_array()
        .ok_or_else(|| JsError::new("keys must be a JSON array"))?
        .iter()
        .filter_map(|v| v.as_str())
        .collect();
    let result =
        w3io_json_core::pick(&object, &keys).map_err(|e| JsError::new(&e.to_string()))?;
    Ok(to_string(&result))
}
