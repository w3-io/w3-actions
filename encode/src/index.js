import * as core from '@actions/core'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const wasm = require('../wasm-bridge/pkg/w3_encode_wasm.js')

const COMMANDS = {
  'base64-encode': () => {
    const input = core.getInput('input', { required: true })
    return { encoded: wasm.base64_encode(Buffer.from(input)) }
  },
  'base64-decode': () => {
    const input = core.getInput('input', { required: true })
    const bytes = wasm.base64_decode(input)
    return { decoded: Buffer.from(bytes).toString('utf-8') }
  },
  'hex-encode': () => {
    const input = core.getInput('input', { required: true })
    return { encoded: wasm.hex_encode(Buffer.from(input)) }
  },
  'hex-decode': () => {
    const input = core.getInput('input', { required: true })
    const bytes = wasm.hex_decode(input)
    return { decoded: Buffer.from(bytes).toString('utf-8'), bytes: wasm.base64_encode(bytes) }
  },
  'url-encode': () => {
    const input = core.getInput('input', { required: true })
    return { encoded: wasm.url_encode(input) }
  },
  'url-decode': () => {
    const input = core.getInput('input', { required: true })
    return { decoded: wasm.url_decode(input) }
  },
  sha256: () => {
    const input = core.getInput('input', { required: true })
    const hash = wasm.sha256(Buffer.from(input))
    return { hash: wasm.hex_encode(hash) }
  },
  'hmac-sha256': () => {
    const input = core.getInput('input', { required: true })
    const key = core.getInput('key', { required: true })
    const mac = wasm.hmac_sha256(Buffer.from(key), Buffer.from(input))
    return { mac: wasm.hex_encode(mac), signature: `sha256=${wasm.hex_encode(mac)}` }
  },
}

try {
  const command = core.getInput('command', { required: true })
  const handler = COMMANDS[command]

  if (!handler) {
    core.setFailed(`Unknown command: "${command}". Available: ${Object.keys(COMMANDS).join(', ')}`)
  } else {
    const result = handler()
    core.setOutput('result', JSON.stringify(result))
  }
} catch (error) {
  core.setFailed(error.message)
}
