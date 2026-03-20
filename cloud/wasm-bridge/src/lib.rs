//! WASM bridge for w3io-cloud-core.
//!
//! Exposes all W3.cloud storage operations: bucket management, object
//! CRUD, presigned URLs, copy, and multipart upload. The JS wrapper
//! handles the actual HTTP calls via `fetch()`.

use wasm_bindgen::prelude::*;

use w3io_cloud_core::auth::{CloudCredentials, PresignParams};
use w3io_cloud_core::request::{CloudOperation, CloudRequest};

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

fn creds(access_key: &str, secret_key: &str) -> CloudCredentials {
    CloudCredentials {
        access_key: access_key.to_string(),
        secret_key: secret_key.to_string(),
    }
}

fn request_to_json(request: &CloudRequest) -> String {
    serde_json::json!({
        "method": request.method,
        "path": request.path,
        "query_string": request.query_string,
        "headers": request.headers,
    })
    .to_string()
}

fn build_op(op: &CloudOperation, endpoint: &str) -> Result<String, JsError> {
    let request = op
        .to_request(endpoint)
        .map_err(|e| JsError::new(&e.to_string()))?;
    Ok(request_to_json(&request))
}

// -------------------------------------------------------------------------
// Signing
// -------------------------------------------------------------------------

/// Sign a request for W3.cloud storage.
///
/// `extra_headers_json` is a JSON array of `[key, value]` pairs to include
/// in the signed canonical request (e.g. `x-amz-copy-source`). Pass `"[]"`
/// or `""` for no extra headers.
///
/// Returns JSON: `{method, path, query_string, headers: [[k,v]]}`
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
    extra_headers_json: &str,
) -> Result<String, JsError> {
    let mut headers = vec![("host".to_string(), host.to_string())];

    // Parse and add extra headers so they're included in the canonical request
    if !extra_headers_json.is_empty() && extra_headers_json != "[]" {
        let extra: Vec<(String, String)> = serde_json::from_str(extra_headers_json)
            .unwrap_or_default();
        headers.extend(extra);
    }

    let mut request = CloudRequest {
        method: method.to_string(),
        path: path.to_string(),
        query_string: if query_string.is_empty() {
            None
        } else {
            Some(query_string.to_string())
        },
        headers,
        body,
    };

    w3io_cloud_core::auth::sign_request(
        &mut request,
        &creds(access_key, secret_key),
        region,
        timestamp,
    )
    .map_err(|e| JsError::new(&e.to_string()))?;

    Ok(request_to_json(&request))
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
) -> Result<String, JsError> {
    w3io_cloud_core::auth::presign_url(&PresignParams {
        method,
        endpoint,
        bucket,
        key,
        credentials: &creds(access_key, secret_key),
        region,
        timestamp,
        expires_seconds,
    })
    .map_err(|e| JsError::new(&e.to_string()))
}

// -------------------------------------------------------------------------
// Bucket operations
// -------------------------------------------------------------------------

/// Build a list-all-buckets request.
#[wasm_bindgen]
pub fn build_list_buckets_request(endpoint: &str) -> Result<String, JsError> {
    build_op(&CloudOperation::ListBuckets, endpoint)
}

/// Build a create-bucket request.
#[wasm_bindgen]
pub fn build_create_bucket_request(endpoint: &str, bucket: &str) -> Result<String, JsError> {
    build_op(
        &CloudOperation::CreateBucket {
            bucket: bucket.to_string(),
        },
        endpoint,
    )
}

/// Build a delete-bucket request.
#[wasm_bindgen]
pub fn build_delete_bucket_request(endpoint: &str, bucket: &str) -> Result<String, JsError> {
    build_op(
        &CloudOperation::DeleteBucket {
            bucket: bucket.to_string(),
        },
        endpoint,
    )
}

/// Build a head-bucket request (check existence).
#[wasm_bindgen]
pub fn build_head_bucket_request(endpoint: &str, bucket: &str) -> Result<String, JsError> {
    build_op(
        &CloudOperation::HeadBucket {
            bucket: bucket.to_string(),
        },
        endpoint,
    )
}

// -------------------------------------------------------------------------
// Object operations
// -------------------------------------------------------------------------

/// Build an upload request (body handled separately by JS).
#[wasm_bindgen]
pub fn build_upload_request(
    endpoint: &str,
    bucket: &str,
    key: &str,
    content_type: &str,
) -> Result<String, JsError> {
    build_op(
        &CloudOperation::Upload {
            bucket: bucket.to_string(),
            key: key.to_string(),
            body: Vec::new(),
            content_type: if content_type.is_empty() {
                None
            } else {
                Some(content_type.to_string())
            },
        },
        endpoint,
    )
}

/// Build a download request.
#[wasm_bindgen]
pub fn build_download_request(endpoint: &str, bucket: &str, key: &str) -> Result<String, JsError> {
    build_op(
        &CloudOperation::Download {
            bucket: bucket.to_string(),
            key: key.to_string(),
        },
        endpoint,
    )
}

/// Build a delete-object request.
#[wasm_bindgen]
pub fn build_delete_request(endpoint: &str, bucket: &str, key: &str) -> Result<String, JsError> {
    build_op(
        &CloudOperation::Delete {
            bucket: bucket.to_string(),
            key: key.to_string(),
        },
        endpoint,
    )
}

/// Build a head-object request (metadata only).
#[wasm_bindgen]
pub fn build_head_request(endpoint: &str, bucket: &str, key: &str) -> Result<String, JsError> {
    build_op(
        &CloudOperation::Head {
            bucket: bucket.to_string(),
            key: key.to_string(),
        },
        endpoint,
    )
}

/// Build a list-objects request with optional prefix and pagination.
#[wasm_bindgen]
pub fn build_list_request(
    endpoint: &str,
    bucket: &str,
    prefix: &str,
    max_keys: u32,
    continuation_token: &str,
) -> Result<String, JsError> {
    build_op(
        &CloudOperation::List {
            bucket: bucket.to_string(),
            prefix: if prefix.is_empty() {
                None
            } else {
                Some(prefix.to_string())
            },
            max_keys: if max_keys == 0 { None } else { Some(max_keys) },
            continuation_token: if continuation_token.is_empty() {
                None
            } else {
                Some(continuation_token.to_string())
            },
        },
        endpoint,
    )
}

/// Build a copy-object request.
#[wasm_bindgen]
pub fn build_copy_request(
    endpoint: &str,
    source_bucket: &str,
    source_key: &str,
    dest_bucket: &str,
    dest_key: &str,
) -> Result<String, JsError> {
    build_op(
        &CloudOperation::Copy {
            source_bucket: source_bucket.to_string(),
            source_key: source_key.to_string(),
            dest_bucket: dest_bucket.to_string(),
            dest_key: dest_key.to_string(),
        },
        endpoint,
    )
}

// -------------------------------------------------------------------------
// Multipart upload
// -------------------------------------------------------------------------

/// Build an initiate-multipart-upload request.
#[wasm_bindgen]
pub fn build_initiate_multipart_request(
    endpoint: &str,
    bucket: &str,
    key: &str,
    content_type: &str,
) -> Result<String, JsError> {
    build_op(
        &CloudOperation::InitiateMultipart {
            bucket: bucket.to_string(),
            key: key.to_string(),
            content_type: if content_type.is_empty() {
                None
            } else {
                Some(content_type.to_string())
            },
        },
        endpoint,
    )
}

/// Build an upload-part request (body handled separately by JS).
#[wasm_bindgen]
pub fn build_upload_part_request(
    endpoint: &str,
    bucket: &str,
    key: &str,
    upload_id: &str,
    part_number: u32,
) -> Result<String, JsError> {
    build_op(
        &CloudOperation::UploadPart {
            bucket: bucket.to_string(),
            key: key.to_string(),
            upload_id: upload_id.to_string(),
            part_number,
            body: Vec::new(),
        },
        endpoint,
    )
}

/// Build a complete-multipart-upload request.
///
/// `parts_json` is a JSON array of `[partNumber, "etag"]` pairs.
#[wasm_bindgen]
pub fn build_complete_multipart_request(
    endpoint: &str,
    bucket: &str,
    key: &str,
    upload_id: &str,
    parts_json: &str,
) -> Result<String, JsError> {
    let parts: Vec<(u32, String)> = serde_json::from_str(parts_json)
        .map_err(|e| JsError::new(&format!("invalid parts JSON: {e}")))?;

    build_op(
        &CloudOperation::CompleteMultipart {
            bucket: bucket.to_string(),
            key: key.to_string(),
            upload_id: upload_id.to_string(),
            parts,
        },
        endpoint,
    )
}

/// Build an abort-multipart-upload request.
#[wasm_bindgen]
pub fn build_abort_multipart_request(
    endpoint: &str,
    bucket: &str,
    key: &str,
    upload_id: &str,
) -> Result<String, JsError> {
    build_op(
        &CloudOperation::AbortMultipart {
            bucket: bucket.to_string(),
            key: key.to_string(),
            upload_id: upload_id.to_string(),
        },
        endpoint,
    )
}
