# W3 Crypto Action Reference Guide

W3 Crypto Action provides cryptographic primitives for W3 workflows via the bridge -- AES-256-GCM encryption, Ed25519 signing, keccak-256 hashing, HKDF key derivation, JWT creation/verification, and TOTP generation. All operations run in-process with no external API calls.

## Quick Start

```yaml
- uses: w3/crypto@v1
  id: encrypted
  with:
    command: aes-encrypt
    key: ${{ secrets.AES_KEY }}
    input: '48656c6c6f'

- uses: w3/crypto@v1
  id: token
  with:
    command: jwt-create
    key: ${{ secrets.JWT_SECRET }}
    algorithm: HS256
    input: '{"sub": "user:42", "exp": 1735689600}'
```

## Commands

### AES-256-GCM Encryption

| Command | Required Inputs | Description |
|---------|----------------|-------------|
| `aes-encrypt` | `key`, `input` | Encrypt data with AES-256-GCM |
| `aes-decrypt` | `key`, `input` | Decrypt AES-256-GCM ciphertext |

| Input | Format | Description |
|-------|--------|-------------|
| `key` | Hex | 256-bit AES key (64 hex chars) |
| `input` | Hex | Plaintext (encrypt) or ciphertext (decrypt) |

### Ed25519 Signing

| Command | Required Inputs | Description |
|---------|----------------|-------------|
| `ed25519-sign` | `key`, `input` | Sign data with Ed25519 private key |
| `ed25519-verify` | `key`, `input`, `signature` | Verify an Ed25519 signature |
| `ed25519-public-key` | `key` | Derive public key from private key |

| Input | Format | Description |
|-------|--------|-------------|
| `key` | Hex | Ed25519 private key (sign) or public key (verify) |
| `input` | Hex | Data to sign or verify |
| `signature` | Hex | Signature to verify |

### Hashing

| Command | Required Inputs | Description |
|---------|----------------|-------------|
| `keccak-256` | `input` | Compute keccak-256 hash |

| Input | Format | Description |
|-------|--------|-------------|
| `input` | Hex | Data to hash |

### Key Derivation (HKDF)

| Command | Required Inputs | Description |
|---------|----------------|-------------|
| `hkdf` | `key`, `length` | Derive a key using HKDF-SHA256 |

| Input | Format | Description |
|-------|--------|-------------|
| `key` | Hex | Input key material |
| `salt` | Hex | Optional salt |
| `info` | Hex | Optional context/info |
| `length` | Integer | Output length in bytes |

### JWT

| Command | Required Inputs | Description |
|---------|----------------|-------------|
| `jwt-create` | `key`, `input`, `algorithm` | Create a signed JWT |
| `jwt-verify` | `key`, `token`, `algorithm` | Verify and decode a JWT |

| Input | Format | Description |
|-------|--------|-------------|
| `key` | Raw string (HS256) or Hex (EdDSA) | Signing key |
| `input` | JSON string | Claims payload (for create) |
| `token` | JWT string | Token to verify |
| `algorithm` | `HS256` or `EdDSA` | Signing algorithm |
| `time` | Unix seconds | Current time for expiry check (verify) |

### TOTP

| Command | Required Inputs | Description |
|---------|----------------|-------------|
| `totp` | `secret` | Generate a TOTP code |

| Input | Format | Description |
|-------|--------|-------------|
| `secret` | Base32 | TOTP shared secret |
| `time` | Unix seconds | Timestamp (defaults to now) |

## Authentication

No external authentication required. Key material is passed directly as inputs. Store keys in W3 secrets and reference them via `${{ secrets.* }}`.

## Full Workflow Example

```yaml
name: Sign and verify data
on: workflow_dispatch

jobs:
  crypto:
    runs-on: ubuntu-latest
    steps:
      - name: Derive signing key from master
        uses: w3/crypto@v1
        id: derived
        with:
          command: hkdf
          key: ${{ secrets.MASTER_KEY }}
          info: '7369676e696e67'
          length: '32'

      - name: Hash the payload
        uses: w3/crypto@v1
        id: hash
        with:
          command: keccak-256
          input: '7b2274797065223a227061796d656e74227d'

      - name: Sign the hash
        uses: w3/crypto@v1
        id: sig
        with:
          command: ed25519-sign
          key: ${{ secrets.ED25519_PRIVATE_KEY }}
          input: ${{ fromJson(steps.hash.outputs.result).hash }}

      - name: Verify the signature
        uses: w3/crypto@v1
        id: verified
        with:
          command: ed25519-verify
          key: ${{ secrets.ED25519_PUBLIC_KEY }}
          input: ${{ fromJson(steps.hash.outputs.result).hash }}
          signature: ${{ fromJson(steps.sig.outputs.result).signature }}

      - name: Create session JWT
        uses: w3/crypto@v1
        id: jwt
        with:
          command: jwt-create
          key: ${{ secrets.JWT_SECRET }}
          algorithm: HS256
          input: |
            {
              "sub": "user:42",
              "iat": 1705305600,
              "exp": 1705392000
            }
```
