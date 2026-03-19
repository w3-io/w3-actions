//! WASM bridge for w3io-audit-core.
//!
//! Exposes audit entry creation and serialization. The actual storage
//! (AuditStore trait) is implemented in JavaScript — the WASM side
//! handles entry construction, sequencing, and serialization.

use std::sync::atomic::{AtomicU64, Ordering};

use wasm_bindgen::prelude::*;

static NEXT_SEQUENCE: AtomicU64 = AtomicU64::new(1);

/// Create a serialized audit entry with an auto-incremented sequence number.
///
/// Returns a JSON string representing the `AuditEntry`. The JS side
/// is responsible for persisting it via its store implementation.
#[wasm_bindgen]
pub fn create_entry(
    category: &str,
    message: &str,
    data_json: &str,
    workflow: &str,
    job: &str,
    step: &str,
    timestamp: &str,
) -> Result<String, JsError> {
    let data: serde_json::Value =
        serde_json::from_str(data_json).map_err(|e| JsError::new(&format!("invalid data JSON: {e}")))?;

    let entry = w3io_audit_core::AuditEntry {
        sequence: NEXT_SEQUENCE.fetch_add(1, Ordering::SeqCst),
        timestamp: timestamp.to_string(),
        category: category.to_string(),
        message: message.to_string(),
        data,
        workflow: if workflow.is_empty() { None } else { Some(workflow.to_string()) },
        job: if job.is_empty() { None } else { Some(job.to_string()) },
        step: if step.is_empty() { None } else { Some(step.to_string()) },
    };

    serde_json::to_string(&entry).map_err(|e| JsError::new(&format!("serialization failed: {e}")))
}

/// Reset the sequence counter (for testing).
#[wasm_bindgen]
pub fn reset_sequence() {
    NEXT_SEQUENCE.store(1, Ordering::SeqCst);
}
