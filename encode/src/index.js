import * as core from '@actions/core'
import { createHash, createHmac } from 'node:crypto'
import { handleError, setJsonOutput } from '@w3-io/action-core'

/**
 * Encode action — pure Node.js built-ins, no WASM or external deps.
 */

const COMMANDS = {
  'base64-encode': () => {
    const input = core.getInput('input', { required: true })
    return { encoded: Buffer.from(input).toString('base64') }
  },
  'base64-decode': () => {
    const input = core.getInput('input', { required: true })
    return { decoded: Buffer.from(input, 'base64').toString('utf-8') }
  },
  'hex-encode': () => {
    const input = core.getInput('input', { required: true })
    return { encoded: Buffer.from(input).toString('hex') }
  },
  'hex-decode': () => {
    const input = core.getInput('input', { required: true })
    const bytes = Buffer.from(input.replace(/^0x/, ''), 'hex')
    return {
      decoded: bytes.toString('utf-8'),
      bytes: bytes.toString('base64'),
    }
  },
  'url-encode': () => {
    const input = core.getInput('input', { required: true })
    return { encoded: encodeURIComponent(input) }
  },
  'url-decode': () => {
    const input = core.getInput('input', { required: true })
    return { decoded: decodeURIComponent(input) }
  },
  sha256: () => {
    const input = core.getInput('input', { required: true })
    const hash = createHash('sha256').update(input).digest('hex')
    return { hash }
  },
  'hmac-sha256': () => {
    const input = core.getInput('input', { required: true })
    const key = core.getInput('key', { required: true })
    const mac = createHmac('sha256', key).update(input).digest('hex')
    return { mac, signature: `sha256=${mac}` }
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

  const result = handler()
  setJsonOutput('result', result)
}

main().catch(handleError)
