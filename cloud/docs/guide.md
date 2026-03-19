---
title: W3.cloud Storage
category: integrations
actions: [upload, download, delete, list, list-buckets, create-bucket, delete-bucket, head, presign, copy]
complexity: beginner
---

# W3.cloud Storage

[W3.cloud](https://w3.cloud) is W3's decentralized object storage — an S3-compatible gateway backed by a global network of distributed nodes. Data is encrypted, erasure-coded, and spread across independent operators with no single point of failure. 80% cheaper than AWS S3 with default multi-region, CDN-like performance and 99.95% availability. Use this action to store workflow artifacts, share files via presigned URLs, archive audit trails, or persist state across workflow runs.

W3.cloud is S3-compatible — any tool or library that works with S3 works with W3.cloud by changing the endpoint to `gateway.w3.cloud`.

## Quick start

```yaml
- name: Upload results
  uses: w3-io/w3-actions/cloud@v0
  with:
    command: upload
    access-key: ${{ secrets.W3_CLOUD_ACCESS_KEY }}
    secret-key: ${{ secrets.W3_CLOUD_SECRET_KEY }}
    bucket: my-workflow-data
    key: results/latest.json
    body: '{"status": "complete", "timestamp": "${{ github.event.head_commit.timestamp }}"}'
```

## Authentication

Generate S3 credentials from the W3.cloud console:

1. Navigate to Access Keys
2. Select credential type and permissions (Read, Write, List, Delete)
3. Scope to specific buckets if needed
4. Store as `W3_CLOUD_ACCESS_KEY` and `W3_CLOUD_SECRET_KEY` in your environment secrets

## Commands

### upload

Upload a file or inline content to a bucket.

| Input | Required | Description |
|-------|----------|-------------|
| `bucket` | yes | Bucket name |
| `key` | yes | Object key (path within bucket) |
| `body` | no | String content to upload |
| `body-file` | no | Path to a file to upload |
| `content-type` | no | MIME type (default: `application/octet-stream`) |

**Output:**

```json
{
  "status": 200,
  "bucket": "my-bucket",
  "key": "data/file.json",
  "size": 1234,
  "etag": "\"abc123\""
}
```

### download

Download an object. Small files (<1MB) return content inline; larger files should use `output-file`.

| Input | Required | Description |
|-------|----------|-------------|
| `bucket` | yes | Bucket name |
| `key` | yes | Object key |
| `output-file` | no | Path to write content to |

### delete

| Input | Required | Description |
|-------|----------|-------------|
| `bucket` | yes | Bucket name |
| `key` | yes | Object key |

### list

List objects in a bucket with optional prefix filter.

| Input | Required | Description |
|-------|----------|-------------|
| `bucket` | yes | Bucket name |
| `prefix` | no | Key prefix filter (e.g. `reports/2026/`) |
| `max-keys` | no | Maximum objects to return (default: 1000) |

**Output:**

```json
{
  "status": 200,
  "bucket": "my-bucket",
  "prefix": "reports/",
  "objects": [
    {"key": "reports/daily.json", "size": 1234},
    {"key": "reports/weekly.json", "size": 5678}
  ],
  "count": 2,
  "truncated": false
}
```

### list-buckets

List all buckets in the account. No inputs beyond credentials.

### create-bucket

| Input | Required | Description |
|-------|----------|-------------|
| `bucket` | yes | Bucket name to create |

### delete-bucket

Delete a bucket (must be empty).

| Input | Required | Description |
|-------|----------|-------------|
| `bucket` | yes | Bucket name to delete |

### head

Get metadata for an object or bucket without downloading content.

| Input | Required | Description |
|-------|----------|-------------|
| `bucket` | yes | Bucket name |
| `key` | no | Object key (omit to check bucket) |

### presign

Generate a presigned URL for temporary public access.

| Input | Required | Description |
|-------|----------|-------------|
| `bucket` | yes | Bucket name |
| `key` | yes | Object key |
| `expires` | no | Validity in seconds (default: 3600) |
| `method` | no | `GET` for download, `PUT` for upload (default: `GET`) |

**Output:**

```json
{
  "url": "https://gateway.w3.cloud/my-bucket/file.pdf?X-Amz-Algorithm=...",
  "method": "GET",
  "bucket": "my-bucket",
  "key": "file.pdf",
  "expires": 3600,
  "validUntil": "2026-03-20T12:00:00.000Z"
}
```

### copy

Copy an object within or across buckets.

| Input | Required | Description |
|-------|----------|-------------|
| `source-bucket` | yes | Source bucket |
| `source-key` | yes | Source object key |
| `bucket` | yes | Destination bucket |
| `key` | yes | Destination object key |

## Examples

### Store and share workflow artifacts

```yaml
- name: Generate report
  run: echo '{"builds": 42, "passed": 41}' > report.json

- name: Upload to W3.cloud
  id: upload
  uses: w3-io/w3-actions/cloud@v0
  with:
    command: upload
    access-key: ${{ secrets.W3_CLOUD_ACCESS_KEY }}
    secret-key: ${{ secrets.W3_CLOUD_SECRET_KEY }}
    bucket: ci-artifacts
    key: reports/${{ github.run_id }}.json
    body-file: report.json

- name: Generate shareable link
  id: share
  uses: w3-io/w3-actions/cloud@v0
  with:
    command: presign
    access-key: ${{ secrets.W3_CLOUD_ACCESS_KEY }}
    secret-key: ${{ secrets.W3_CLOUD_SECRET_KEY }}
    bucket: ci-artifacts
    key: reports/${{ github.run_id }}.json
    expires: '86400'

- name: Post link
  run: echo "Report: ${{ fromJSON(steps.share.outputs.result).url }}"
```

### Archive audit trail

```yaml
- name: Store audit entry
  uses: w3-io/w3-actions/cloud@v0
  with:
    command: upload
    access-key: ${{ secrets.W3_CLOUD_ACCESS_KEY }}
    secret-key: ${{ secrets.W3_CLOUD_SECRET_KEY }}
    bucket: audit-logs
    key: ${{ github.repository }}/${{ github.run_id }}.json
    content-type: application/json
    body: |
      {
        "workflow": "${{ github.workflow }}",
        "run_id": "${{ github.run_id }}",
        "actor": "${{ github.actor }}",
        "timestamp": "${{ github.event.head_commit.timestamp }}",
        "status": "completed"
      }
```

## Beyond this W3 integration

This action provides S3-compatible object storage via the W3.cloud
gateway. W3.cloud is also the planned **data availability (DA)
layer** for the W3 protocol.

| Layer | What | Status |
|-------|------|--------|
| This action (S3 gateway) | Object storage: upload, download, list, share | Live |
| DA layer | Workflow state persistence, receipt archival, verifiable data availability | Planned |

As the DA layer matures, this action will expand to cover
DA-specific operations — storing and retrieving workflow receipts,
epoch data, and verifiable state proofs. The S3 operations you
use today will continue to work; DA operations will be added as
new commands.

The same credentials and buckets work across both the action and
direct S3 tools (AWS CLI, rclone, any S3-compatible library).
