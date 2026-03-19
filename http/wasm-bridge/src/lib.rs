//! WASM bridge for w3io-http-core.
//!
//! The JS host provides two callbacks:
//! - `fetch_fn(method, url, headers_json) => Promise<{status, headers, body}>`
//! - `sleep_fn(ms) => Promise<void>`
//!
//! The Rust retry and timeout logic runs in WASM, calling back
//! to JS for network I/O and timing.

use std::time::Duration;

use js_sys::{Function, Promise, Uint8Array};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;

use w3io_http_core::{
    error::HttpError,
    request::{HttpMethod, HttpRequest},
    response::HttpResponse,
    retry::RetryPolicy,
    transport::HttpTransport,
};

/// JS-backed HTTP transport.
struct JsTransport {
    fetch_fn: Function,
    sleep_fn: Function,
}

impl HttpTransport for JsTransport {
    async fn send(
        &self,
        request: &HttpRequest,
        _timeout: Duration,
    ) -> Result<HttpResponse, HttpError> {
        let method = match request.method {
            HttpMethod::Delete => "DELETE",
            HttpMethod::Get => "GET",
            HttpMethod::Head => "HEAD",
            HttpMethod::Options => "OPTIONS",
            HttpMethod::Patch => "PATCH",
            HttpMethod::Post => "POST",
            HttpMethod::Put => "PUT",
        };

        let headers_json = serde_json::to_string(&request.headers).unwrap_or_default();

        let promise: Promise = self
            .fetch_fn
            .call3(
                &JsValue::NULL,
                &JsValue::from_str(method),
                &JsValue::from_str(&request.url),
                &JsValue::from_str(&headers_json),
            )
            .map_err(|e| HttpError::Transport(format!("fetch call failed: {e:?}")))?
            .into();

        let result = JsFuture::from(promise)
            .await
            .map_err(|e| HttpError::Transport(format!("fetch rejected: {e:?}")))?;

        let status = js_sys::Reflect::get(&result, &"status".into())
            .ok()
            .and_then(|v| v.as_f64())
            .ok_or_else(|| HttpError::Transport("missing or invalid status".into()))?
            as u16;

        let headers_str = js_sys::Reflect::get(&result, &"headers".into())
            .ok()
            .and_then(|v| v.as_string())
            .unwrap_or_default();

        let headers: Vec<(String, String)> =
            serde_json::from_str(&headers_str).unwrap_or_default();

        let body_val = js_sys::Reflect::get(&result, &"body".into())
            .unwrap_or(JsValue::UNDEFINED);

        let body = if body_val.is_instance_of::<Uint8Array>() {
            Uint8Array::from(body_val).to_vec()
        } else if let Some(s) = body_val.as_string() {
            s.into_bytes()
        } else {
            Vec::new()
        };

        Ok(HttpResponse {
            status,
            headers,
            body,
        })
    }

    async fn sleep(&self, duration: Duration) {
        let ms = duration.as_millis() as f64;
        if let Ok(promise) = self.sleep_fn.call1(&JsValue::NULL, &JsValue::from_f64(ms)) {
            let _ = JsFuture::from(Promise::from(promise)).await;
        }
    }
}

/// Execute an HTTP request with retry logic.
///
/// `fetch_fn`: JS function `(method, url, headers_json) => Promise<{status, headers, body}>`
/// `sleep_fn`: JS function `(ms) => Promise<void>`
///
/// Returns JSON: `{"status": number, "headers": [[k,v]], "body": "string"}`
#[wasm_bindgen]
pub async fn execute(
    fetch_fn: Function,
    sleep_fn: Function,
    method: &str,
    url: &str,
    headers_json: &str,
    max_retries: u32,
    base_delay_ms: u32,
    timeout_ms: u32,
) -> Result<String, JsError> {
    let transport = JsTransport {
        fetch_fn,
        sleep_fn,
    };

    let policy = RetryPolicy {
        max_retries,
        base_delay: Duration::from_millis(u64::from(base_delay_ms)),
    };

    let http_method = match method.to_uppercase().as_str() {
        "DELETE" => HttpMethod::Delete,
        "GET" => HttpMethod::Get,
        "HEAD" => HttpMethod::Head,
        "OPTIONS" => HttpMethod::Options,
        "PATCH" => HttpMethod::Patch,
        "POST" => HttpMethod::Post,
        "PUT" => HttpMethod::Put,
        other => return Err(JsError::new(&format!("unsupported method: {other}"))),
    };

    let headers: Vec<(String, String)> =
        serde_json::from_str(headers_json).unwrap_or_default();

    let request = HttpRequest {
        method: http_method,
        url: url.to_string(),
        headers,
        body: None,
    };

    let client = w3io_http_core::HttpClient::new(
        transport,
        policy,
        Duration::from_millis(u64::from(timeout_ms)),
    );

    let response = client
        .execute(request)
        .await
        .map_err(|e| JsError::new(&e.to_string()))?;

    let result = serde_json::json!({
        "status": response.status,
        "headers": response.headers,
        "body": response.body_string(),
    });

    Ok(result.to_string())
}
