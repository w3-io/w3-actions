import * as core from '@actions/core'
import { bridge, handleError, setJsonOutput } from '@w3-io/action-core'

/**
 * Crypto action — all operations go through the W3 syscall bridge.
 *
 * The bridge runs crypto-core natively on the host. No WASM, no bundled
 * crypto libraries. The action is a thin command router that maps
 * action.yml inputs to bridge HTTP params.
 */

const COMMANDS = {
  'keccak-256': async () => {
    const data = core.getInput('input', { required: true })
    const result = await bridge.crypto('keccak256', { data })
    return { hash: result.hash }
  },

  'aes-encrypt': async () => {
    const key = core.getInput('key', { required: true })
    const data = core.getInput('input', { required: true })
    const result = await bridge.crypto('aes-encrypt', { key, data })
    return { ciphertext: result.ciphertext }
  },

  'aes-decrypt': async () => {
    const key = core.getInput('key', { required: true })
    const data = core.getInput('input', { required: true })
    const result = await bridge.crypto('aes-decrypt', { key, data })
    return { plaintext: result.plaintext }
  },

  'ed25519-sign': async () => {
    const privateKey = core.getInput('key', { required: true })
    const message = core.getInput('input', { required: true })
    const result = await bridge.crypto('ed25519-sign', { privateKey, message })
    return { signature: result.signature }
  },

  'ed25519-verify': async () => {
    const publicKey = core.getInput('key', { required: true })
    const message = core.getInput('input', { required: true })
    const signature = core.getInput('signature', { required: true })
    const result = await bridge.crypto('ed25519-verify', {
      publicKey,
      message,
      signature,
    })
    return { valid: result.valid }
  },

  'ed25519-public-key': async () => {
    const privateKey = core.getInput('key', { required: true })
    const result = await bridge.crypto('ed25519-public-key', { privateKey })
    return { publicKey: result.publicKey }
  },

  hkdf: async () => {
    const ikm = core.getInput('key', { required: true })
    const salt = core.getInput('salt', { required: false }) || undefined
    const info = core.getInput('info', { required: false }) || undefined
    const lengthStr = core.getInput('length', { required: false })
    const length = lengthStr ? parseInt(lengthStr, 10) : undefined
    const result = await bridge.crypto('hkdf', { ikm, salt, info, length })
    return { key: result.key }
  },

  'jwt-create': async () => {
    const algorithm = core.getInput('algorithm', { required: true })
    const claims = core.getInput('input', { required: true })
    const key = core.getInput('key', { required: true })
    const result = await bridge.crypto('jwt-sign', {
      claims,
      key,
      algorithm,
    })
    return { token: result.token }
  },

  'jwt-verify': async () => {
    const token = core.getInput('token', { required: true })
    const algorithm = core.getInput('algorithm', { required: true })
    const key = core.getInput('key', { required: true })
    const result = await bridge.crypto('jwt-verify', {
      token,
      key,
      algorithm,
    })
    return { valid: result.valid, claims: result.claims }
  },

  totp: async () => {
    const secret = core.getInput('secret', { required: true })
    const timeStr = core.getInput('time', { required: false })
    const params = { secret }
    if (timeStr) params.time = parseInt(timeStr, 10)
    const result = await bridge.crypto('totp', params)
    return { code: result.code }
  },
}

async function main() {
  const command = core.getInput('command', { required: true })
  const handler = COMMANDS[command]

  if (!handler) {
    core.setFailed(
      `Unknown command: "${command}". Available: ${Object.keys(COMMANDS).join(', ')}`,
    )
    return
  }

  const result = await handler()
  setJsonOutput('result', result)
}

main().catch(handleError)
