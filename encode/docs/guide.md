# W3 Encode Action Reference Guide

W3 Encode Action provides encoding, decoding, and hashing utilities for W3 workflows -- base64, hex, URL encoding/decoding, SHA-256 hashing, and HMAC-SHA256 signing. These are stateless operations with no external dependencies.

## Quick Start

```yaml
- uses: w3/encode@v1
  id: encoded
  with:
    command: base64-encode
    input: 'Hello, World!'

- uses: w3/encode@v1
  id: hash
  with:
    command: sha256
    input: 'data to hash'
```

## Commands

### Base64

| Command | Required Inputs | Description |
|---------|----------------|-------------|
| `base64-encode` | `input` | Encode string to base64 |
| `base64-decode` | `input` | Decode base64 to string |

### Hex

| Command | Required Inputs | Description |
|---------|----------------|-------------|
| `hex-encode` | `input` | Encode string to hex |
| `hex-decode` | `input` | Decode hex to string |

### URL

| Command | Required Inputs | Description |
|---------|----------------|-------------|
| `url-encode` | `input` | Percent-encode a string |
| `url-decode` | `input` | Decode a percent-encoded string |

### Hashing

| Command | Required Inputs | Description |
|---------|----------------|-------------|
| `sha256` | `input` | Compute SHA-256 hash |
| `hmac-sha256` | `input`, `key` | Compute HMAC-SHA256 |

| Input | Description |
|-------|-------------|
| `input` | Data to hash or sign |
| `key` | HMAC secret key (for `hmac-sha256` only) |

## Inputs

| Name | Required | Description |
|------|----------|-------------|
| `command` | Yes | Operation to perform (8 commands) |
| `input` | Yes | Input data |
| `key` | No | HMAC key (for `hmac-sha256`) |

## Outputs

| Name | Description |
|------|-------------|
| `result` | JSON result of the operation |

## Authentication

No authentication required. All operations are local.

## Full Workflow Example

```yaml
name: Encode payload and sign webhook
on: workflow_dispatch

jobs:
  encode:
    runs-on: ubuntu-latest
    steps:
      - name: Base64 encode payload
        uses: w3/encode@v1
        id: payload
        with:
          command: base64-encode
          input: '{"event": "payment.completed", "amount": 100}'

      - name: Hash the payload
        uses: w3/encode@v1
        id: hash
        with:
          command: sha256
          input: '{"event": "payment.completed", "amount": 100}'

      - name: Sign with HMAC
        uses: w3/encode@v1
        id: signature
        with:
          command: hmac-sha256
          input: '{"event": "payment.completed", "amount": 100}'
          key: ${{ secrets.WEBHOOK_SECRET }}

      - name: URL-encode for query string
        uses: w3/encode@v1
        id: query
        with:
          command: url-encode
          input: 'name=Alice&status=active&filter=amount>100'

      - name: Hex encode binary data
        uses: w3/encode@v1
        id: hex
        with:
          command: hex-encode
          input: ${{ fromJson(steps.hash.outputs.result).hash }}
```
