import * as core from '@actions/core'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const wasm = require('../wasm-bridge/pkg/w3_crypto_wasm.js')

function hexInput(name, required = true) {
  const raw = core.getInput(name, { required })
  if (!raw && !required) return null
  return wasm.hex_decode(raw)
}

const COMMANDS = {
  'keccak-256': () => {
    const data = hexInput('input')
    return { hash: wasm.hex_encode(wasm.keccak_256(data)) }
  },

  'aes-encrypt': () => {
    const key = hexInput('key')
    const plaintext = hexInput('input')
    return { ciphertext: wasm.hex_encode(wasm.aes_encrypt(key, plaintext)) }
  },

  'aes-decrypt': () => {
    const key = hexInput('key')
    const ciphertext = hexInput('input')
    return { plaintext: wasm.hex_encode(wasm.aes_decrypt(key, ciphertext)) }
  },

  'ed25519-sign': () => {
    const privateKey = hexInput('key')
    const message = hexInput('input')
    return { signature: wasm.hex_encode(wasm.ed25519_sign(privateKey, message)) }
  },

  'ed25519-verify': () => {
    const publicKey = hexInput('key')
    const message = hexInput('input')
    const signature = hexInput('signature')
    return { valid: wasm.ed25519_verify(publicKey, message, signature) }
  },

  'ed25519-public-key': () => {
    const privateKey = hexInput('key')
    return { publicKey: wasm.hex_encode(wasm.ed25519_public_key(privateKey)) }
  },

  hkdf: () => {
    const ikm = hexInput('key')
    const salt = hexInput('salt', false) || new Uint8Array(0)
    const info = hexInput('info', false) || new Uint8Array(0)
    const length = parseInt(core.getInput('length', { required: true }), 10)
    return { key: wasm.hex_encode(wasm.hkdf_sha256(ikm, salt, info, length)) }
  },

  'jwt-create': () => {
    const algorithm = core.getInput('algorithm', { required: true })
    const claims = core.getInput('input', { required: true })
    const key = core.getInput('key', { required: true })
    // HS256 keys are raw strings; EdDSA keys are hex
    const keyBytes =
      algorithm === 'EdDSA'
        ? wasm.hex_decode(key)
        : new TextEncoder().encode(key)
    return { token: wasm.jwt_create(algorithm, claims, keyBytes) }
  },

  'jwt-verify': () => {
    const token = core.getInput('token', { required: true })
    const algorithm = core.getInput('algorithm', { required: true })
    const key = core.getInput('key', { required: true })
    const timeStr = core.getInput('time', { required: false })
    const keyBytes =
      algorithm === 'EdDSA'
        ? wasm.hex_decode(key)
        : new TextEncoder().encode(key)
    const time = timeStr ? BigInt(timeStr) : undefined
    return { claims: wasm.jwt_verify(token, algorithm, keyBytes, time) }
  },

  totp: () => {
    const secret = core.getInput('secret', { required: true })
    const timeStr = core.getInput('time', { required: false })
    // Decode base32 secret to bytes
    const secretBytes = base32Decode(secret)
    const time = timeStr
      ? BigInt(timeStr)
      : BigInt(Math.floor(Date.now() / 1000))
    return { code: wasm.totp_generate(secretBytes, time) }
  },
}

// Minimal base32 decoder (RFC 4648)
function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const cleaned = input.replace(/=+$/, '').toUpperCase()
  let bits = 0
  let value = 0
  const output = []
  for (const char of cleaned) {
    const idx = alphabet.indexOf(char)
    if (idx === -1) throw new Error(`Invalid base32 character: ${char}`)
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(output)
}

try {
  const command = core.getInput('command', { required: true })
  const handler = COMMANDS[command]

  if (!handler) {
    core.setFailed(
      `Unknown command: "${command}". Available: ${Object.keys(COMMANDS).join(', ')}`
    )
  } else {
    const result = handler()
    core.setOutput('result', JSON.stringify(result))
  }
} catch (error) {
  core.setFailed(error.message)
}
