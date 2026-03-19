//! WASM bridge for w3io-cloud-core.
//!
//! Exposes W3.cloud request signing and presigned URL generation.
//! The JS wrapper handles the actual HTTP calls via `fetch()`.

use wasm_bindgen::prelude::*;

use w3io_cloud_core::auth::{CloudCredentials, PresignParams};
use w3io_cloud_core::request::{CloudOperation, CloudRequest};

/// Sign a request for W3.cloud storage.
///
/// Returns a JSON object with the signed request details:
/// `{method, path, query_string, headers: [[k,v]], body}`
#[wasm_bindgen]
pub fn sign_request(
    method: &str,
    path: &str,
    query_string: &str,
    host: &str,
    body: Option<Vec<u8>>,
    access_key: &str,
    secret_key: &str,
    region: &str,
    timestamp: &str,
) -> Result<String, JsError> {
    let mut request = CloudRequest {
        method: method.to_string(),
        path: path.to_string(),
        query_string: if query_string.is_empty() {
            None
        } else {
            Some(query_string.to_string())
        },
        headers: vec![("host".to_string(), host.to_string())],
        body,
    };

    let creds = CloudCredentials {
        access_key: access_key.to_string(),
        secret_key: secret_key.to_string(),
    };

    w3io_cloud_core::auth::sign_request(&mut request, &creds, region, timestamp)
        .map_err(|e| JsError::new(&e.to_string()))?;

    let result = serde_json::json!({
        "method": request.method,
        "path": request.path,
        "query_string": request.query_string,
        "headers": request.headers,
    });

    Ok(result.to_string())
}

/// Generate a presigned URL for temporary object access.
#[wasm_bindgen]
pub fn presign_url(
    method: &str,
    endpoint: &str,
    bucket: &str,
    key: &str,
    access_key: &str,
    secret_key: &str,
    region: &str,
    timestamp: &str,
    expires_seconds: u64,
) -> String {
    let creds = CloudCredentials {
        access_key: access_key.to_string(),
        secret_key: secret_key.to_string(),
    };

    w3io_cloud_core::auth::presign_url(&PresignParams {
        method,
        endpoint,
        bucket,
        key,
        credentials: &creds,
        region,
        timestamp,
        expires_seconds,
    })
}

/// Build an upload request (unsigned).
///
/// Returns JSON with method, path, headers. Caller signs via `sign_request`.
#[wasm_bindgen]
pub fn build_upload_request(
    endpoint: &str,
    bucket: &str,
    key: &str,
    content_type: &str,
) -> Result<String, JsError> {
    let op = CloudOperation::Upload {
        bucket: bucket.to_string(),
        key: key.to_string(),
        body: Vec::new(), // body handled separately by JS
        content_type: if content_type.is_empty() {
            None
        } else {
            Some(content_type.to_string())
        },
    };

    let request = op
        .to_request(endpoint)
        .map_err(|e| JsError::new(&e.to_string()))?;

    let result = serde_json::json!({
        "method": request.method,
        "path": request.path,
        "headers": request.headers,
    });

    Ok(result.to_string())
}

/// Build a list-buckets request (unsigned).
#[wasm_bindgen]
pub fn build_list_buckets_request(endpoint: &str) -> Result<String, JsError> {
    let request = CloudOperation::ListBuckets
        .to_request(endpoint)
        .map_err(|e| JsError::new(&e.to_string()))?;

    let result = serde_json::json!({
        "method": request.method,
        "path": request.path,
        "headers": request.headers,
    });

    Ok(result.to_string())
}

/// Build a list-objects request (unsigned).
#[wasm_bindgen]
pub fn build_list_request(
    endpoint: &str,
    bucket: &str,
    prefix: &str,
    max_keys: u32,
) -> Result<String, JsError> {
    let op = CloudOperation::List {
        bucket: bucket.to_string(),
        prefix: if prefix.is_empty() {
            None
        } else {
            Some(prefix.to_string())
        },
        max_keys: if max_keys == 0 { None } else { Some(max_keys) },
        continuation_token: None,
    };

    let request = op
        .to_request(endpoint)
        .map_err(|e| JsError::new(&e.to_string()))?;

    let result = serde_json::json!({
        "method": request.method,
        "path": request.path,
        "query_string": request.query_string,
        "headers": request.headers,
    });

    Ok(result.to_string())
}
