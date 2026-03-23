/* tslint:disable */
/* eslint-disable */

/**
 * Build an abort-multipart-upload request.
 */
export function build_abort_multipart_request(endpoint: string, bucket: string, key: string, upload_id: string): string;

/**
 * Build a complete-multipart-upload request.
 *
 * `parts_json` is a JSON array of `[partNumber, "etag"]` pairs.
 */
export function build_complete_multipart_request(endpoint: string, bucket: string, key: string, upload_id: string, parts_json: string): string;

/**
 * Build a copy-object request.
 */
export function build_copy_request(endpoint: string, source_bucket: string, source_key: string, dest_bucket: string, dest_key: string): string;

/**
 * Build a create-bucket request.
 */
export function build_create_bucket_request(endpoint: string, bucket: string): string;

/**
 * Build a delete-bucket request.
 */
export function build_delete_bucket_request(endpoint: string, bucket: string): string;

/**
 * Build a delete-object request.
 */
export function build_delete_request(endpoint: string, bucket: string, key: string): string;

/**
 * Build a download request.
 */
export function build_download_request(endpoint: string, bucket: string, key: string): string;

/**
 * Build a head-bucket request (check existence).
 */
export function build_head_bucket_request(endpoint: string, bucket: string): string;

/**
 * Build a head-object request (metadata only).
 */
export function build_head_request(endpoint: string, bucket: string, key: string): string;

/**
 * Build an initiate-multipart-upload request.
 */
export function build_initiate_multipart_request(endpoint: string, bucket: string, key: string, content_type: string): string;

/**
 * Build a list-all-buckets request.
 */
export function build_list_buckets_request(endpoint: string): string;

/**
 * Build a list-objects request with optional prefix and pagination.
 */
export function build_list_request(endpoint: string, bucket: string, prefix: string, max_keys: number, continuation_token: string): string;

/**
 * Build an upload-part request (body handled separately by JS).
 */
export function build_upload_part_request(endpoint: string, bucket: string, key: string, upload_id: string, part_number: number): string;

/**
 * Build an upload request (body handled separately by JS).
 */
export function build_upload_request(endpoint: string, bucket: string, key: string, content_type: string): string;

/**
 * Generate a presigned URL for temporary object access.
 */
export function presign_url(method: string, endpoint: string, bucket: string, key: string, access_key: string, secret_key: string, region: string, timestamp: string, expires_seconds: bigint): string;

/**
 * Sign a request for W3.cloud storage.
 *
 * `extra_headers_json` is a JSON array of `[key, value]` pairs to include
 * in the signed canonical request (e.g. `x-amz-copy-source`). Pass `"[]"`
 * or `""` for no extra headers.
 *
 * Returns JSON: `{method, path, query_string, headers: [[k,v]]}`
 */
export function sign_request(method: string, path: string, query_string: string, host: string, body: Uint8Array | null | undefined, access_key: string, secret_key: string, region: string, timestamp: string, extra_headers_json: string): string;
